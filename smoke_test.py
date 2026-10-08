# pyrefly: ignore [missing-import]
import ollama
import time

model = "qwen3-vl:2b"
image = "photos/test.jpeg"

prompt = """
Describe only what is visible in this photo in 2-3 sentences.
Name the main object or subject, its condition, and visible surroundings.
If the photo is blurry, dark, or unclear, say so.
Do not guess about anything you cannot actually see.
"""

start = time.perf_counter()

response = ollama.chat(
    model=model,
    messages=[
        {
            "role": "user",
            "content": prompt,
            "images": [image],
        }
    ],
)

elapsed = time.perf_counter() - start

print("\nMODEL OUTPUT:")
print(response["message"]["content"])

print(f"\nTIME: {elapsed:.2f} seconds")