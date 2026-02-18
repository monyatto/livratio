// DOM要素
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const processing = document.getElementById('processing');
const previewArea = document.getElementById('previewArea');
const previewImage = document.getElementById('previewImage');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const description = document.getElementById('description');
const exampleImages = document.getElementById('exampleImages');

// 定数
const TARGET_RATIO = 3 / 4; // 幅:高さ = 3:4
const MAX_WIDTH = 960;
const MAX_HEIGHT = 1280;
const BLUR_RADIUS = 20;

// 処理結果を保持
let processedImageDataUrl = null;
let originalFileName = '';

// イベントリスナー設定
uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);
downloadBtn.addEventListener('click', downloadImage);
resetBtn.addEventListener('click', reset);

// ドラッグ&ドロップ対応
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
        processFile(files[0]);
    }
});

/**
 * ファイル選択ハンドラ
 */
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        processFile(file);
    }
}

/**
 * ファイル処理開始
 */
function processFile(file) {
    originalFileName = file.name.replace(/\.[^/.]+$/, '');
    showProcessing();

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => processImage(img);
        img.onerror = () => {
            alert('画像の読み込みに失敗しました');
            reset();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

/**
 * 画像処理メイン
 */
function processImage(originalImage) {
    const origWidth = originalImage.width;
    const origHeight = originalImage.height;

    // 現在の比率を確認
    const currentRatio = origWidth / origHeight;

    // 3:4比率に必要なサイズを計算
    let finalWidth, finalHeight;

    if (currentRatio > TARGET_RATIO) {
        // 横長画像は幅基準で高さを拡張し、全体を保持する
        finalWidth = origWidth;
        finalHeight = Math.round(origWidth / TARGET_RATIO);
    } else {
        // 縦長画像は高さ基準で幅を拡張し、全体を保持する
        finalHeight = origHeight;
        finalWidth = Math.round(origHeight * TARGET_RATIO);
    }

    // 最大サイズ制限を適用
    if (finalWidth > MAX_WIDTH || finalHeight > MAX_HEIGHT) {
        const scaleW = MAX_WIDTH / finalWidth;
        const scaleH = MAX_HEIGHT / finalHeight;
        const scale = Math.min(scaleW, scaleH);
        finalWidth = Math.round(finalWidth * scale);
        finalHeight = Math.round(finalHeight * scale);
    }

    // 元画像をトリミングせずに3:4内へ収める
    const imageScale = Math.min(finalWidth / origWidth, finalHeight / origHeight);
    const scaledOrigWidth = Math.round(origWidth * imageScale);
    const scaledOrigHeight = Math.round(origHeight * imageScale);

    // 余白位置を中央揃えで計算
    const imageX = Math.floor((finalWidth - scaledOrigWidth) / 2);
    const imageY = Math.floor((finalHeight - scaledOrigHeight) / 2);

    // Canvasサイズ設定
    canvas.width = finalWidth;
    canvas.height = finalHeight;

    // 背景用のぼかし画像を描画（元画像の端を等倍で貼り付け）
    drawBlurredBackground(originalImage, finalWidth, finalHeight, imageX, imageY, scaledOrigWidth, scaledOrigHeight);

    // 中央に元画像を描画
    ctx.drawImage(
        originalImage,
        imageX,
        imageY,
        scaledOrigWidth,
        scaledOrigHeight
    );

    // 結果を保存してプレビュー表示
    processedImageDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    showPreview(finalWidth, finalHeight);
}

/**
 * ぼかし背景を描画
 */
function drawBlurredBackground(originalImage, finalWidth, finalHeight, imageX, imageY, scaledOrigWidth, scaledOrigHeight) {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = finalWidth;
    tempCanvas.height = finalHeight;

    // 中央に元画像を等倍で描画
    tempCtx.drawImage(originalImage, imageX, imageY, scaledOrigWidth, scaledOrigHeight);

    // 左余白：元画像の左端部分を切り取って貼り付け
    if (imageX > 0) {
        // 元画像からソースとして左端imageX分を取得
        const srcWidth = Math.ceil(imageX / scaledOrigWidth * originalImage.width);
        tempCtx.drawImage(
            originalImage,
            0, 0, srcWidth, originalImage.height,
            0, imageY, imageX, scaledOrigHeight
        );
    }

    // 右余白：元画像の右端部分を切り取って貼り付け
    const rightStart = imageX + scaledOrigWidth;
    const rightPadding = finalWidth - rightStart;
    if (rightPadding > 0) {
        const srcWidth = Math.ceil(rightPadding / scaledOrigWidth * originalImage.width);
        tempCtx.drawImage(
            originalImage,
            originalImage.width - srcWidth, 0, srcWidth, originalImage.height,
            rightStart, imageY, rightPadding, scaledOrigHeight
        );
    }

    // 上余白：上端のピクセルで埋める
    if (imageY > 0) {
        tempCtx.drawImage(
            tempCanvas,
            0, imageY, finalWidth, 1,
            0, 0, finalWidth, imageY
        );
    }

    // 下余白：下端のピクセルで埋める
    const bottomStart = imageY + scaledOrigHeight;
    if (bottomStart < finalHeight) {
        tempCtx.drawImage(
            tempCanvas,
            0, bottomStart - 1, finalWidth, 1,
            0, bottomStart, finalWidth, finalHeight - bottomStart
        );
    }

    // ぼかしを適用（段階的縮小→拡大方式で全ブラウザ対応）
    const passes = 4;
    let currentCanvas = tempCanvas;
    for (let i = 0; i < passes; i++) {
        const stepCanvas = document.createElement('canvas');
        const stepCtx = stepCanvas.getContext('2d');
        stepCanvas.width = Math.max(1, Math.round(currentCanvas.width / 2));
        stepCanvas.height = Math.max(1, Math.round(currentCanvas.height / 2));
        stepCtx.imageSmoothingEnabled = true;
        stepCtx.imageSmoothingQuality = 'high';
        stepCtx.drawImage(currentCanvas, 0, 0, stepCanvas.width, stepCanvas.height);
        currentCanvas = stepCanvas;
    }

    // 縮小画像を元サイズに拡大
    const blurredCanvas = document.createElement('canvas');
    const blurredCtx = blurredCanvas.getContext('2d');
    blurredCanvas.width = tempCanvas.width;
    blurredCanvas.height = tempCanvas.height;
    blurredCtx.imageSmoothingEnabled = true;
    blurredCtx.imageSmoothingQuality = 'high';
    blurredCtx.drawImage(currentCanvas, 0, 0, blurredCanvas.width, blurredCanvas.height);
    ctx.drawImage(blurredCanvas, 0, 0, finalWidth, finalHeight);
}

/**
 * 処理中表示
 */
function showProcessing() {
    uploadArea.hidden = true;
    description.hidden = true;
    exampleImages.hidden = true;
    processing.hidden = false;
    previewArea.hidden = true;
}

/**
 * プレビュー表示
 */
function showPreview(width, height) {
    processing.hidden = true;
    previewArea.hidden = false;
    previewArea.classList.add('fade-in');
    previewImage.src = processedImageDataUrl;
}

/**
 * 画像ダウンロード
 */
function downloadImage() {
    if (!processedImageDataUrl) return;

    const now = new Date();
    const dateStr = now.getFullYear() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0') + '_' +
        String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0') +
        String(now.getSeconds()).padStart(2, '0');

    const link = document.createElement('a');
    link.href = processedImageDataUrl;
    link.download = `image_${dateStr}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * リセット
 */
function reset() {
    fileInput.value = '';
    processedImageDataUrl = null;
    originalFileName = '';
    uploadArea.hidden = false;
    description.hidden = false;
    exampleImages.hidden = false;
    processing.hidden = true;
    previewArea.hidden = true;
    previewArea.classList.remove('fade-in');
}
