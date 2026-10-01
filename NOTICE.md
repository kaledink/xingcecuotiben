# 第三方组件说明

本项目在 `vendor/` 和 `ocr/` 目录中附带了以下第三方组件的发行文件，各组件的许可证全文见 `licenses/` 目录。

- `vendor/pdf.min.js`、`vendor/pdf.worker.min.js` — PDF.js 3.11.174，Copyright Mozilla Foundation，Apache License 2.0（`licenses/pdfjs-LICENSE.txt`）。
- `vendor/jspdf.umd.min.js` — jsPDF 2.5.1，Copyright (c) 2010-2021 James Hall, (c) 2015-2021 yWorks GmbH，MIT License（`licenses/jspdf-LICENSE.txt`）。
- `ocr/tesseract.min.js`、`ocr/worker.min.js` — tesseract.js 5.1.1，Apache License 2.0（`licenses/tesseract.js-LICENSE.txt`）。
  - **修改说明**：`ocr/worker.min.js` 中初始化语言时的一处代码由 `t.data` 改为 `t.code`，用于修复以对象形式传入语言数据（`{code, data}`）时语言名称拼接错误的问题。除此之外未做改动。
- `ocr/core/tesseract-core-lstm.wasm.js`、`ocr/core/tesseract-core-simd-lstm.wasm.js` — tesseract.js-core 5.1.1，Apache License 2.0（`licenses/tesseract.js-core-LICENSE.txt`）。
- `ocr/lang/chi_sim.traineddata.wasm` — Tesseract 简体中文识别模型（tessdata_best，经 npm 包 `@tesseract.js-data/chi_sim` 的 `4.0.0_best_int` 版本打包，gzip 压缩），Apache License 2.0。为了能被静态托管正确提供，文件扩展名改为 `.wasm`，内容未改动。
