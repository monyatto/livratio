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
const SCALE_FACTOR = 1.1; // 110%

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
        // 横長すぎる場合（すでに3:4より横長）→ 高さを基準に幅を計算
        finalHeight = origHeight;
        finalWidth = Math.round(origHeight * TARGET_RATIO);
    } else {
        // 縦長または3:4未満の場合 → 高さを基準に3:4になるよう幅を拡張
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

    // 元画像をfinalHeightに合わせてリサイズした場合のサイズ
    const imageScale = finalHeight / origHeight;
    const scaledOrigWidth = Math.round(origWidth * imageScale);
    const scaledOrigHeight = finalHeight;

    // 左右に追加する幅を計算
    const totalPadding = finalWidth - scaledOrigWidth;
    const leftPadding = Math.floor(totalPadding / 2);
    const rightPadding = totalPadding - leftPadding;

    // Canvasサイズ設定
    canvas.width = finalWidth;
    canvas.height = finalHeight;

    // 背景用の拡大・ぼかし画像を描画
    drawBlurredBackground(originalImage, finalWidth, finalHeight, scaledOrigWidth, scaledOrigHeight, leftPadding, rightPadding);

    // 中央に元画像を描画
    ctx.drawImage(
        originalImage,
        leftPadding,
        0,
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
function drawBlurredBackground(originalImage, finalWidth, finalHeight, scaledOrigWidth, scaledOrigHeight, leftPadding, rightPadding) {
    // 拡大サイズ（110%）
    const blurWidth = Math.round(scaledOrigWidth * SCALE_FACTOR);
    const blurHeight = Math.round(scaledOrigHeight * SCALE_FACTOR);

    // 端の黒い影を防ぐため、余白を追加したCanvasを作成
    const padding = BLUR_RADIUS * 2;
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = blurWidth + padding * 2;
    tempCanvas.height = blurHeight + padding * 2;

    // 中央に画像を描画
    tempCtx.drawImage(originalImage, padding, padding, blurWidth, blurHeight);

    // 端を画像の端のピクセルで埋める（左右）
    // 左端
    tempCtx.drawImage(originalImage,
        0, 0, 1, originalImage.height,  // ソース：左端1px
        0, padding, padding, blurHeight  // 描画先
    );
    // 右端
    tempCtx.drawImage(originalImage,
        originalImage.width - 1, 0, 1, originalImage.height,
        padding + blurWidth, padding, padding, blurHeight
    );
    // 上端
    tempCtx.drawImage(originalImage,
        0, 0, originalImage.width, 1,
        padding, 0, blurWidth, padding
    );
    // 下端
    tempCtx.drawImage(originalImage,
        0, originalImage.height - 1, originalImage.width, 1,
        padding, padding + blurHeight, blurWidth, padding
    );

    // ぼかしを適用（段階的縮小→拡大方式で全ブラウザ対応）
    const passes = 5;
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

    // 拡大画像の中央からオフセットを計算
    const offsetX = (blurWidth - scaledOrigWidth) / 2;
    const offsetY = (blurHeight - scaledOrigHeight) / 2;

    // 左側のぼかし背景（元画像の下に少し隠れるように余分に描画）
    if (leftPadding > 0) {
        const overlap = BLUR_RADIUS;
        ctx.drawImage(
            blurredCanvas,
            padding, padding + offsetY,
            leftPadding + offsetX + overlap, blurHeight - offsetY * 2,
            0, 0,
            leftPadding + overlap, finalHeight
        );
    }

    // 右側のぼかし背景（元画像の下に少し隠れるように余分に描画）
    if (rightPadding > 0) {
        const overlap = BLUR_RADIUS;
        const sourceX = padding + blurWidth - rightPadding - offsetX - overlap;
        ctx.drawImage(
            blurredCanvas,
            sourceX, padding + offsetY,
            rightPadding + offsetX + overlap, blurHeight - offsetY * 2,
            finalWidth - rightPadding - overlap, 0,
            rightPadding + overlap, finalHeight
        );
    }
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
