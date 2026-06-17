# 🎨 Centralized Image Studio — Professional Local-First Image Operations Suite

[![React](https://img.shields.io/badge/React-19.0-blue?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![WebAssembly](https://img.shields.io/badge/WebAssembly-WASM-purple?logo=webassembly&logoColor=white)](https://webassembly.org)
[![Local-First](https://img.shields.io/badge/Privacy-100%25%20Local-success?logo=lock&logoColor=white)](#privacy-policy)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

An elegant, centralized, client-side web application designed to consolidate all standard image editing, processing, and optimization operations into a single premium interface. By leveraging **WebAssembly (WASM)** and **Local-First architecture**, this studio executes heavy AI models and processing tasks entirely within the user's browser—eliminating data transfer latency, third-party server risks, and subscription costs.

---

## ✨ Features Breakdown

### 🤖 AI Background Removal (Cutout)
- **Local Neural Net**: Employs `@imgly/background-removal` running an ONNX runtime locally in-browser via WebAssembly.
- **Zero Server Overhead**: Isolates foreground subjects from complex backgrounds with feather edge anti-aliasing directly on your device.

### 📝 Text Extraction (OCR Scanner)
- **Web Worker Scanning**: Powered by `tesseract.js` executing OCR engines locally.
- **Batch Scanning**: Scans text in the background and outputs it to a copyable text area or downloads it as a `.txt` file.

### ⚡ Smart Adaptive Size Compression
- **Binary Search Compression Solver**: Solves target file size limits (e.g. compress down to exactly `200 KB`) by running a search algorithm on canvas dimensions and JPEG/WebP quality coordinates.
- **Manual Adjustments**: Quality and resolution scale sliders with real-time compression ratio percentages.

### 🔄 Multi-Format Converter
- **Instant Client-Side Conversions**: Converts images between `PNG`, `JPG` (JPEG), `WebP`, and `BMP` client-side using HTML5 Canvas pixel export encoders.

### ✂️ Transform, Crop & Mirror
- **Preset Ratios & Free Crop**: Bounding box overlays constraint ratios: `1:1 (Square)`, `16:9 (Widescreen)`, `4:3 (TV)`, `3:2 (DSLR)`.
- **Transformations**: Fine-grain rotate (90° steps), vertical flip, and horizontal flip operations.

### 🎨 Visual Filters & Adjustments
- **Preset Instagram Filters**: Vintage, Cyberpunk, Noir, Dramatic, Warm, Cold, and Chrome presets.
- **Fine-Tune Sliders**: Brightness, Contrast, Saturation, Blur, Grayscale, Sepia, Invert Colors, and Hue Rotate.

### 🏷️ Custom Text Watermarking
- **Draggable Anchors**: Center, Top-Left, Top-Right, Bottom-Left, and Bottom-Right alignments.
- **Customizable Styling**: Font size scaling, opacity levels, and color swatches.

### 📦 Batch Operations & Directory Loader
- **Recursive Directory Loader**: Upload folders recursively to scan hundreds of files.
- **Bulk Processor**: Run format conversions, compression (quality or target size), AI background removal, or resizing on all selected files simultaneously.
- **ZIP Bundler**: Compiles and exports processed batches inside a single `.zip` folder.

---

## 🎨 Design Systems & User Experience

- **Draggable Dual Sidebar System**: Drag the workspace lists and operations tool boundaries to custom widths, or collapse them to expand canvas editing space.
- **Before/After Split Slider**: Swipeable comparison overlay to inspect original vs. processed images in real time.
- **Pixel Color Picker**: A magnifier color picker with canvas-level pixel inspection displaying Hex, RGB, and HSL coordinates.
- **Adaptive Responsive Layout**: Converts sidebars into floating sliding drawers on mobile screen viewports for clear screen space.
- **Theme Synced Toggle**: Seamless Light and Dark modes with saved user preferences in `localStorage`.

---

## 🛡️ Privacy Policy

**100% Client-Side Privacy Policy**:
- Your files are **never** uploaded to any external server.
- All image scaling, neural network isolation, character scans, and compression happen strictly in-memory within your browser.
- Secure for corporate and private data workflows containing confidential images.

---

## 🛠️ Development Setup & Installation

Ensure you have [Node.js](https://nodejs.org) (v18+) installed.

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/image-operations-studio.git
cd image-operations-studio
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173/](http://localhost:5173/) to test.

### 4. Build Production Bundle
```bash
npm run build
```
Generates optimized, minified production assets under the `/dist` directory.

---

## 🔧 Technical Stack Details

- **Core Framework**: React 19.x + TypeScript + Vite 6.x
- **Icons Pack**: Lucide React
- **Local AI BG Removal**: `@imgly/background-removal`
- **OCR Character Recognition**: `tesseract.js`
- **Batch Zipper**: `jszip`
- **Canvas Rendering**: HTML5 Canvas 2D Context API

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
