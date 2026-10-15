#!/usr/bin/env python3
"""Exporta a fonte Mermaid e acrescenta uma legenda ao PNG, sem alterar o modelo."""

import argparse
import hashlib
from pathlib import Path
import shutil
import subprocess
import tempfile

try:
    from PIL import Image, ImageDraw, ImageFont, PngImagePlugin
except ImportError:
    raise SystemExit("Pillow não encontrado. Instale-o no ambiente de exportação: pip install Pillow")


ROOT = Path(__file__).resolve().parents[1]
ARCHITECTURE = ROOT / "docs" / "arquitetura"
INK = "#182b35"
LEGEND_ITEMS = (
    ("arrow", "Associação com direção", "A acessa ou referencia B; a ponta indica B."),
    ("line", "Ligação sem direção indicada", "A e B estão relacionados; a linha não define a navegação."),
    ("composition", "Composição: losango preenchido", "B faz parte de A; o losango fica no todo A."),
    ("aggregation", "Agregação UML: losango aberto", "A agrupa B; o losango fica em A. Não equivale a agregado DDD."),
    ("multiplicity", "Multiplicidades nos extremos", "1 = exatamente um; * = zero ou mais; 0..1 = zero ou um; 1..* = um ou mais."),
    ("note", "Ligação pontilhada de anotação", "Conecta uma nota explicativa ao elemento; não acrescenta uma associação de domínio."),
)
LEGEND_NOTES = (
    "Setas representam acesso ou referência; não definem sequência de chamadas, navegação de telas ou autorização.",
    "Na fonte Mermaid, *-- desenha composição; o * entre aspas junto ao extremo indica multiplicidade.",
    "Student — Enrolment: extremos combinados herdados foram preservados; seu significado completo ainda requer revisão.",
)


def wrap_text(draw, text, font, width):
    lines = []
    for paragraph in text.splitlines():
        current = ""
        for word in paragraph.split():
            candidate = f"{current} {word}".strip()
            if current and draw.textlength(candidate, font=font) > width:
                lines.append(current)
                current = word
            else:
                current = candidate
        lines.append(current)
    return lines


def draw_symbol(draw, kind, x, y, width, font, scale):
    stroke = max(1, round(4 * scale))
    radius = max(3, round(19 * scale))
    start, end = x + 65 * scale, x + width - 65 * scale
    if kind == "note":
        for left in range(round(start), round(end), max(3, round(18 * scale))):
            draw.line((left, y, min(left + 5 * scale, end), y), fill=INK, width=stroke)
    else:
        draw.line((start, y, end, y), fill=INK, width=stroke)
    if kind in ("arrow", "composition", "aggregation", "multiplicity"):
        draw.line((end - radius, y - radius / 2, end, y, end - radius, y + radius / 2), fill=INK, width=stroke)
    if kind in ("composition", "aggregation"):
        diamond = ((start, y), (start + radius, y - radius / 2), (start + 2 * radius, y), (start + radius, y + radius / 2))
        draw.polygon(diamond, fill=INK if kind == "composition" else "#f8fafc", outline=INK, width=stroke)
    draw.text((x + 10 * scale, y), "A", font=font, fill=INK, anchor="lm")
    draw.text((x + width - 40 * scale, y), "B", font=font, fill=INK, anchor="lm")
    if kind == "multiplicity":
        draw.text((start + 18 * scale, y - 42 * scale), "1", font=font, fill=INK, anchor="mm")
        draw.text((end - 18 * scale, y - 42 * scale), "*", font=font, fill=INK, anchor="mm")


def add_legend(diagram, font_path):
    width = diagram.width
    scale = width / 6800
    margin = round(130 * scale)
    gap = round(110 * scale)
    symbol_width = round(330 * scale)
    column_width = (width - 2 * margin - gap) // 2
    text_width = column_width - symbol_width - round(35 * scale)
    font = ImageFont.truetype(font_path, max(12, round(44 * scale)))
    title_font = ImageFont.truetype(font_path, max(18, round(65 * scale)))
    label_font = ImageFont.truetype(font_path, max(14, round(49 * scale)))
    line_height = round(font.size * 1.4)
    probe = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    rows = []
    for index in range(0, len(LEGEND_ITEMS), 2):
        pair = []
        for kind, title, description in LEGEND_ITEMS[index:index + 2]:
            titles = wrap_text(probe, title, label_font, text_width)
            descriptions = wrap_text(probe, description, font, text_width)
            pair.append((kind, titles, descriptions))
        row_height = max(len(titles) * line_height + len(lines) * line_height for _, titles, lines in pair)
        rows.append((pair, row_height + round(55 * scale)))
    notes = [wrap_text(probe, text, font, width - 2 * margin) for text in LEGEND_NOTES]
    header_height = round(165 * scale)
    notes_height = sum((len(lines) + 0.4) * line_height for lines in notes)
    footer_height = round(margin + header_height + sum(height for _, height in rows) + notes_height + margin)
    result = Image.new("RGB", (width, diagram.height + footer_height), "#f8fafc")
    result.paste(diagram, (0, 0))
    draw = ImageDraw.Draw(result)
    top = diagram.height
    draw.line((margin, top + round(25 * scale), width - margin, top + round(25 * scale)), fill="#b9c8cf", width=max(1, round(3 * scale)))
    y = top + margin
    draw.text((margin, y), "Legenda de relações e multiplicidades", font=title_font, fill=INK)
    y += header_height
    for pair, row_height in rows:
        for column, (kind, titles, lines) in enumerate(pair):
            x = margin + column * (column_width + gap)
            draw_symbol(draw, kind, x, y + round(75 * scale), symbol_width, font, scale)
            text_x = x + symbol_width + round(35 * scale)
            text_y = y
            for title in titles:
                draw.text((text_x, text_y), title, font=label_font, fill=INK)
                text_y += line_height
            for line in lines:
                draw.text((text_x, text_y), line, font=font, fill=INK)
                text_y += line_height
        y += row_height
    for lines in notes:
        for line in lines:
            draw.text((margin, y), line, font=font, fill=INK)
            y += line_height
        y += round(0.4 * line_height)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=ARCHITECTURE / "modelo-ddd.mmd")
    parser.add_argument("--output", type=Path, default=ARCHITECTURE / "ddd-notificacoes-incremental.png")
    parser.add_argument("--mmdc", default="mmdc", help="Executável Mermaid CLI instalado no ambiente de exportação.")
    parser.add_argument("--puppeteer-config", type=Path, help="JSON de configuração do navegador, repassado ao Mermaid CLI.")
    parser.add_argument("--font", default="DejaVuSans.ttf", help="Nome ou caminho de uma fonte TrueType com suporte a português.")
    parser.add_argument("--width", type=int, default=6800, help="Largura da exportação em pixels (mínimo: 2000).")
    parser.add_argument("--svg", type=Path, help="Salva também o SVG do modelo sem o rodapé, para inspeção.")
    args = parser.parse_args()
    source = args.input.resolve()
    output = args.output.resolve()
    if not source.is_file():
        parser.error(f"Fonte não encontrada: {source}")
    if output.suffix.lower() != ".png" or output == source:
        parser.error("O destino deve ser um PNG diferente da fonte Mermaid.")
    if args.width < 2000:
        parser.error("Use largura de pelo menos 2000 pixels para manter a legenda legível.")
    if args.svg and (args.svg.resolve() in (source, output) or args.svg.suffix.lower() != ".svg"):
        parser.error("O destino SVG deve ser diferente da fonte e do PNG e ter extensão .svg.")
    executable = shutil.which(args.mmdc)
    if executable is None:
        parser.error("Mermaid CLI não encontrado. Instale-o ou informe seu caminho com --mmdc.")
    if args.puppeteer_config and not args.puppeteer_config.is_file():
        parser.error("Arquivo de configuração do navegador não encontrado.")
    try:
        ImageFont.truetype(args.font, 44)
    except OSError:
        parser.error("Fonte não encontrada. Informe um arquivo TrueType com --font.")
    command = [executable, "-i", str(source), "-b", "white"]
    if args.puppeteer_config:
        command.extend(["-p", str(args.puppeteer_config.resolve())])
    try:
        with tempfile.TemporaryDirectory(prefix="modelo-ddd-") as temporary:
            raw_png = Path(temporary) / "modelo.png"
            subprocess.run(command + ["-o", str(raw_png), "--size", str(args.width)], check=True)
            if args.svg:
                args.svg.parent.mkdir(parents=True, exist_ok=True)
                subprocess.run(command + ["-o", str(args.svg.resolve())], check=True)
            with Image.open(raw_png) as image:
                result = add_legend(image.convert("RGB"), args.font)
            metadata = PngImagePlugin.PngInfo()
            metadata.add_text("MermaidSource", source.name)
            metadata.add_text("MermaidSourceSHA256", hashlib.sha256(source.read_bytes()).hexdigest())
            output.parent.mkdir(parents=True, exist_ok=True)
            result.save(output, pnginfo=metadata)
            print(f"PNG com legenda: {output} ({result.width} x {result.height})")
    except (OSError, subprocess.CalledProcessError) as error:
        parser.exit(1, f"Falha na exportação: {error}\n")


if __name__ == "__main__":
    main()
