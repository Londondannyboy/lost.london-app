#!/usr/bin/env python3
"""Parse Thorney Island Copy.md into chunks for Neon knowledge base with proper formatting."""

import json
import sys
import re

def format_content(text):
    """Clean up content and add proper paragraph breaks."""
    # Fix escaped characters
    text = re.sub(r'\\\.', '.', text)
    text = re.sub(r'\\-', '-', text)
    text = re.sub(r'\\!', '!', text)

    # Remove the weird double-space line breaks from PDF
    # Join lines that were broken mid-sentence
    lines = text.split('\n')
    cleaned_lines = []
    current_para = ""

    for line in lines:
        line = line.strip()
        if not line:
            if current_para:
                cleaned_lines.append(current_para)
                current_para = ""
            continue

        # Check if this line continues a sentence
        if current_para:
            # If previous para doesn't end with sentence-ending punctuation, join
            if not re.search(r'[.!?:"]$', current_para):
                current_para += " " + line
            else:
                cleaned_lines.append(current_para)
                current_para = line
        else:
            current_para = line

    if current_para:
        cleaned_lines.append(current_para)

    # Join into text and add paragraph breaks every 2-3 sentences
    full_text = " ".join(cleaned_lines)

    # Split into sentences
    sentences = re.split(r'(?<=[.!?])\s+', full_text)

    # Group sentences into paragraphs (2-3 sentences each)
    paragraphs = []
    current_para = []

    for sentence in sentences:
        current_para.append(sentence)
        # Create paragraph break after 2-3 sentences, or if sentence is long
        if len(current_para) >= 2 and (len(current_para) >= 3 or len(' '.join(current_para)) > 400):
            paragraphs.append(' '.join(current_para))
            current_para = []

    if current_para:
        paragraphs.append(' '.join(current_para))

    # Join with double newlines for clear paragraph breaks
    return '\n\n'.join(paragraphs)

def parse_thorney_island(filepath, chunk_size=4000):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Skip the front matter/ToC - content starts around line 133
    content = ''.join(lines[132:])

    # Format the content with proper paragraphs
    formatted_content = format_content(content)

    # Split into fixed-size chunks, trying to break at paragraph ends
    chunks = []
    chunk_num = 1
    pos = 0

    while pos < len(formatted_content):
        end = min(pos + chunk_size, len(formatted_content))

        # Try to find a good break point (end of paragraph or sentence)
        if end < len(formatted_content):
            search_start = max(pos + chunk_size - 500, pos)
            best_break = end

            # Try paragraph break first
            idx = formatted_content.rfind('\n\n', search_start, end)
            if idx > pos:
                best_break = idx + 2
            else:
                # Try sentence end
                for pattern in ['. ', '? ', '! ']:
                    idx = formatted_content.rfind(pattern, search_start, end)
                    if idx > pos:
                        best_break = idx + len(pattern)
                        break

            end = best_break

        chunk_text = formatted_content[pos:end].strip()
        if chunk_text:
            chunks.append({
                'chunk_number': chunk_num,
                'content': chunk_text
            })
            chunk_num += 1

        pos = end

    return chunks

if __name__ == '__main__':
    chunks = parse_thorney_island('/Users/dankeegan/lost.london/public/Thorney Island Copy.md')

    # Output as JSON
    print(json.dumps(chunks, ensure_ascii=False))

    # Print summary to stderr
    print(f"\n--- Created {len(chunks)} chunks ---", file=sys.stderr)
    for ch in chunks[:3]:
        preview = ch['content'][:150].replace('\n', ' ')
        print(f"  Chunk {ch['chunk_number']}: {len(ch['content'])} chars - {preview}...", file=sys.stderr)
    if len(chunks) > 3:
        print(f"  ... and {len(chunks) - 3} more", file=sys.stderr)
