# DOCX Preflight Checklist

For best HTML and equation fidelity, please check the source `.docx` before submission.

1. Use native Word equations only.
- Insert equations with Word's built-in equation editor.
- Do not use pasted images of equations.
- Avoid legacy Equation Editor, MathType, OLE, or other embedded equation objects if possible.

2. Use real math structure, not visual formatting.
- Use true fractions, radicals, matrices, subscripts, superscripts, limits, and operators.
- Do not simulate math with plain text, spaces, tabs, or manually raised/lowered text.

3. Check complex equation patterns carefully.
- Prescripts like `{}_qD`
- Right-side equation numbers
- Multi-line aligned equations
- Braces, arrows, or annotations above or below expressions
- Special operators and uncommon symbols

4. Avoid manual alignment tricks.
- Do not align equations or text with repeated spaces or tabs.
- Do not build equation layouts with nearby text boxes.

5. Use standard Unicode symbols.
- Prefer standard Unicode math symbols over special symbol-font glyphs.
- Avoid depending on a specific font shape to convey meaning.

6. Keep equation formatting semantic.
- Avoid unnecessary mixed bold, italic, or font styling inside equations unless it changes meaning.
- Use math formatting intentionally, not for visual appearance alone.

7. Use real list and reference formatting.
- For references, use true numbered lists.
- Do not type numbers manually and then add hanging indents by hand.

8. Use real tables when content is tabular.
- Do not simulate tables with tabs or spaces.
- Check merged cells and nested tables if present.

9. Minimize floating layout where possible.
- Prefer inline objects unless floating placement is essential.
- Check captions, figures, and tables for consistent placement.

10. Final review before export.
- Open the document and inspect:
  - all equations
  - numbered references
  - multi-line displays
  - figures, tables, and captions
  - special symbols
- If something is built visually instead of structurally, rebuild it structurally.

## Best Rule

If Word understands it as structure, HTML export is usually reliable.
If it only looks correct because of manual formatting, fidelity will be weaker.
