import os
import time

from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Maximum image upload size: 10 MB
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024

# Connect to Gemini
api_key = os.getenv("GEMINI_API_KEY")

client = genai.Client(api_key=api_key) if api_key else None

# Primary and backup models
PRIMARY_MODEL = "gemini-3.8-flash"
BACKUP_MODEL = "gemini-2.5-flash"


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/analyze", methods=["POST"])
def analyze_plant():

    # Check image exists
    if "image" not in request.files:
        return jsonify({
            "success": False,
            "error": "Please upload a plant image."
        }), 400

    image = request.files["image"]

    if image.filename == "":
        return jsonify({
            "success": False,
            "error": "Please select an image."
        }), 400

    # Supported image formats
    allowed_types = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ]

    if image.mimetype not in allowed_types:
        return jsonify({
            "success": False,
            "error": "Please upload JPG, PNG, or WEBP."
        }), 400

    # Check API key
    if client is None:
        return jsonify({
            "success": False,
            "error": "Gemini API key is missing. Please check your API configuration."
        }), 500

    # Read image
    image_bytes = image.read()

    # AI instructions
    prompt = """
You are Plant Doctor AI, an intelligent plant health assistant.

Analyze the uploaded photograph of the plant.

Provide a detailed but easy-to-understand report using:

1. PLANT IDENTIFICATION
Identify the plant if possible.

2. OVERALL HEALTH
Choose one:
Healthy
Mildly Stressed
Moderately Stressed
Severely Stressed

3. VISIBLE SYMPTOMS
Describe the symptoms actually visible in the photograph.

4. POSSIBLE CAUSES
Explain possible reasons for the symptoms, including:
- Plant diseases
- Pest damage
- Nutrient deficiencies
- Overwatering
- Underwatering
- Excess sunlight
- Environmental stress

Do not claim a disease is confirmed based only on a photograph.

5. CONFIDENCE LEVEL
Give a confidence level of High, Medium, or Low.
Explain the reason.

6. RECOMMENDED ACTIONS
Suggest practical steps involving:
- Watering
- Sunlight
- Soil
- Nutrients
- Disease and pest management

7. PREVENTION
Explain how the plant owner can prevent future problems.

8. ADDITIONAL INFORMATION
Mention whether another photograph or sensor readings
would help improve the assessment.

Use simple language.

Do not invent symptoms.
Do not recommend unsafe chemical treatments.
Make it clear that this is a preliminary AI assessment,
not a confirmed scientific diagnosis.
"""

    # Prepare image
    image_part = types.Part.from_bytes(
        data=image_bytes,
        mime_type=image.mimetype
    )

    # Models to try
    models_to_try = [
        PRIMARY_MODEL,
        BACKUP_MODEL
    ]

    # Retry settings
    max_attempts = 2

    for model_name in models_to_try:

        for attempt in range(max_attempts):

            try:

                print(
                    f"Trying model: {model_name}, "
                    f"attempt: {attempt + 1}"
                )

                response = client.models.generate_content(
                    model=model_name,
                    contents=[
                        prompt,
                        image_part
                    ]
                )

                diagnosis = response.text

                if not diagnosis:
                    raise Exception("The AI returned an empty response.")

                print(f"Success using model: {model_name}")

                return jsonify({
                    "success": True,
                    "diagnosis": diagnosis,
                    "model": model_name
                })

            except Exception as error:

                error_message = str(error)

                print(f"Error with {model_name}: {error_message}")

                # Errors that may be temporary
                temporary_errors = [
                    "503",
                    "UNAVAILABLE",
                    "high demand",
                    "overloaded",
                    "429",
                    "RESOURCE_EXHAUSTED",
                    "500",
                    "INTERNAL",
                    "502",
                    "504",
                    "deadline",
                    "timeout"
                ]

                is_temporary = any(
                    message.lower() in error_message.lower()
                    for message in temporary_errors
                )

                # Retry temporary errors
                if is_temporary and attempt < max_attempts - 1:

                    wait_time = 2 ** (attempt + 1)

                    print(
                        f"Retrying in {wait_time} seconds..."
                    )

                    time.sleep(wait_time)

                    continue

                # Stop retrying this model and try backup
                break

    # Both models failed
    return jsonify({
        "success": False,
        "error": (
            "Our Plant Doctor AI is temporarily busy. "
            "Please try again in a few minutes."
        )
    }), 503


# Handle large image uploads
@app.errorhandler(413)
def file_too_large(error):

    return jsonify({
        "success": False,
        "error": "Image is too large. Please upload an image under 10 MB."
    }), 413


if __name__ == "__main__":

    app.run(debug=True)
