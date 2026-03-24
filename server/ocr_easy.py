import sys
import io
import os
import re
import warnings

# WindowsでもUTF-8で出力する
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# EasyOCRの警告・ログを抑制
warnings.filterwarnings('ignore')
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['PYTHONWARNINGS'] = 'ignore'

import logging
logging.disable(logging.CRITICAL)

import easyocr


def join_cjk(text):
    """EasyOCRが文字間に挿入するスペースを除去する"""
    # CJK文字（漢字・ひらがな・カタカナ・全角）間のスペースを除去
    text = re.sub(r'(?<=[\u3040-\u9fff\uff00-\uffef]) (?=[\u3040-\u9fff\uff00-\uffef])', '', text)
    # 数字とCJK文字の間のスペースも除去（例: "1 月" → "1月"）
    text = re.sub(r'(?<=\d) (?=[\u3040-\u9fff\uff00-\uffef])', '', text)
    text = re.sub(r'(?<=[\u3040-\u9fff\uff00-\uffef]) (?=\d)', '', text)
    return text


def main():
    if len(sys.argv) < 2:
        sys.exit(1)

    image_path = sys.argv[1]
    if not os.path.exists(image_path):
        sys.exit(1)

    # stderrをNULLに向けてEasyOCRのログを完全抑制
    devnull = open(os.devnull, 'w')
    old_stderr = sys.stderr
    sys.stderr = devnull

    try:
        reader = easyocr.Reader(['ja', 'en'], verbose=False)
        results = reader.readtext(image_path, detail=0, paragraph=False)
    finally:
        sys.stderr = old_stderr
        devnull.close()

    for line in results:
        line = join_cjk(line.strip())
        if line:
            print(line)


if __name__ == '__main__':
    main()
