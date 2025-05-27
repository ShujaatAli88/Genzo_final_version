from transformers import pipeline
# from ..config import settings
from PIL import Image
import numpy as np
# segmenter = pipeline(model=settings.MODEL_NAME)
segmenter = pipeline(model="mattmdjaga/segformer_b2_clothes")


def segment_clothing(img, clothes=["Hat", "Upper-clothes", "skirt", "Pants", "Dress", "Belt", "Left-shoe", "Right-shoe", "Bag"]):
    segments = segmenter(img)
    mask_list = [s['mask'] for s in segments if s['label'] in clothes]

    if not mask_list:
        return img

    final_mask = np.maximum.reduce(mask_list)
    final_mask = Image.fromarray(final_mask)
    img.putalpha(final_mask)
    return img
