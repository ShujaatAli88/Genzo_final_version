# import aiofiles
# from ..config import settings
# import aiohttp
# from pathlib import Path
# import zipfile
from PIL import Image
from segmentation import segment_clothing
import io
import sys


# async def process_image(image_path, filename):
# async with aiofiles.open(image_path, mode='rb') as f:
#     content = await f.read()

# img = Image.open(io.BytesIO(content))
# img = img.convert("RGBA")
# img = await compress_image(img)
# processed_img = segment_clothing(img)

# output_path = Path(settings.PROCESSED_DIR) / f"processed_{filename}"
# processed_img.save(output_path, format="PNG")
# return output_path

# async def compress_image(img, max_size=settings.MAX_IMAGE_SIZE):
#     if img.size[0] > max_size[0] or img.size[1] > max_size[1]:
#         img.thumbnail(max_size, Image.LANCZOS)
#     return img


# async def process_image_url(image_url):
#     async with aiohttp.ClientSession() as session:
#         async with session.get(image_url) as response:
#             content = await response.read()

#     img = Image.open(io.BytesIO(content))
#     img = await compress_image(img)
#     processed_img = segment_clothing(img)

#     output_path = Path(settings.PROCESSED_DIR) / "processed_url_image.png"
#     processed_img.save(output_path, format="PNG")
#     return output_path


# async def process_image_batch(files, batch_id):
#     batch_folder = Path(settings.BATCH_DIR) / str(batch_id)
#     batch_folder.mkdir(parents=True, exist_ok=True)

#     for file in files:
#         contents = await file.read()
#         img = Image.open(io.BytesIO(contents))
#         img = await compress_image(img)
#         processed_img = segment_clothing(img)

#         output_path = batch_folder / f"processed_{file.filename}"
#         processed_img.save(output_path, format="PNG")

#     zip_path = Path(settings.PROCESSED_DIR) / \
#         f"processed_images_{batch_id}.zip"
#     with zipfile.ZipFile(zip_path, 'w') as zipf:
#         for file_path in batch_folder.glob('*'):
#             zipf.write(file_path, arcname=file_path.name)

#     return zip_path


def process_image(input_path, output_path, background_color=None):
    try:
        # Open and convert image to RGBA
        img = Image.open(input_path).convert("RGBA")

        # Process the image using your segmentation function
        processed_img = segment_clothing(img)

        # Handle background color if specified
        if background_color and background_color != 'transparent':
            # Convert hex color to RGB
            if background_color.startswith('#'):
                background_color = background_color[1:]
            r = int(background_color[:2], 16)
            g = int(background_color[2:4], 16)
            b = int(background_color[4:], 16)

            # Create a new image with the background color
            background = Image.new('RGBA', processed_img.size, (r, g, b, 255))
            # Paste the processed image onto the background
            background.paste(processed_img, mask=processed_img)
            processed_img = background

        # Save the final image
        processed_img.save(output_path, format="PNG")
        return True

    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        return False


if __name__ == "__main__":
    # Parse command line arguments
    if len(sys.argv) < 3:
        print(
            "Usage: python process_image.py <input_path> <output_path> [background_color]", file=sys.stderr)
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]
    # Get background color if provided
    background_color = sys.argv[3] if len(sys.argv) > 3 else None

    success = process_image(input_path, output_path, background_color)
    sys.exit(0 if success else 1)
