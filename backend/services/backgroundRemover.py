# import io
# import sys
# from PIL import Image
# from rembg import remove


# def remove_background(input_path, output_path):
#     try:
#         # Read input image
#         with open(input_path, 'rb') as input_file:
#             input_bytes = input_file.read()

#         # Remove background
#         output_bytes = remove(input_bytes)

#         # Save the result
#         img = Image.open(io.BytesIO(output_bytes)).convert('RGBA')
#         img.save(output_path, 'PNG')

#         return True
#     except Exception as e:
#         print(f"Error: {str(e)}", file=sys.stderr)
#         return False


# if __name__ == "__main__":
#     if len(sys.argv) != 3:
#         print("Usage: python remove_bg.py <input_path> <output_path>", file=sys.stderr)
#         sys.exit(1)

#     input_path = sys.argv[1]
#     output_path = sys.argv[2]

#     success = remove_background(input_path, output_path)
#     sys.exit(0 if success else 1)

import io
import sys
import json
from PIL import Image
from rembg import remove


def remove_background(input_path, output_path, background_color=None):
    try:
        # Read input image
        with open(input_path, 'rb') as input_file:
            input_bytes = input_file.read()

        # Remove background
        output_bytes = remove(input_bytes)

        # Open the processed image
        img = Image.open(io.BytesIO(output_bytes)).convert('RGBA')

        # If a background color is specified and it's not 'transparent'
        if background_color and background_color != 'transparent':
            # Convert hex color to RGB
            if background_color.startswith('#'):
                background_color = background_color[1:]
            r = int(background_color[:2], 16)
            g = int(background_color[2:4], 16)
            b = int(background_color[4:], 16)

            # Create a new image with the background color
            background = Image.new('RGBA', img.size, (r, g, b, 255))
            # Paste the processed image onto the background
            background.paste(img, mask=img)
            img = background

        # Save the result
        img.save(output_path, 'PNG')
        return True
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        return False


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(
            "Usage: python remove_bg.py <input_path> <output_path> [background_color]", file=sys.stderr)
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]
    background_color = sys.argv[3] if len(sys.argv) > 3 else None

    success = remove_background(input_path, output_path, background_color)
    sys.exit(0 if success else 1)
