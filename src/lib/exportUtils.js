export function exportToWord(questions, title = 'Generated Quiz') {
  let html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
  <head>
    <meta charset='utf-8'>
    <title>${title}</title>
    <style>
      body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #000; padding: 20px; }
      h1 { color: #4338ca; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
      h3 { margin-top: 24px; margin-bottom: 8px; color: #1f2937; }
      ul { margin-top: 0; padding-left: 20px; list-style-type: none; }
      li { margin-bottom: 4px; }
      .correct-ans { font-weight: bold; color: #16a34a; }
      .explanation { color: #4b5563; font-style: italic; font-size: 0.9em; margin-top: 8px; }
      .divider { border-bottom: 1px dashed #d1d5db; margin: 16px 0; }
    </style>
  </head>
  <body>
    <h1>${title}</h1>
  `;

  questions.forEach((q, i) => {
    html += `<h3>${i + 1}. ${q.question}</h3><ul>`;
    q.options.forEach((opt, optIdx) => {
      const letter = String.fromCharCode(65 + optIdx);
      const optText = opt.replace(/^[ABCD]\)\s?/, '');
      html += `<li><b>${letter})</b> ${optText}</li>`;
    });
    
    html += `</ul>`;
    const correctLetter = String.fromCharCode(65 + q.correct);
    html += `<p class="correct-ans">Correct Answer: ${correctLetter}</p>`;
    html += `<p class="explanation"><b>Explanation:</b> ${q.explanation}</p>`;
    html += `<div class="divider"></div>`;
  });

  html += `</body></html>`;

  // Create Blob and trigger download
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title.replace(/\s+/g, '_')}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
