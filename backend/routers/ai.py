from fastapi import APIRouter, HTTPException, Body
from fastapi.responses import Response
import os
from pydantic import BaseModel
import json
import requests
import html
import re
from dotenv import load_dotenv
from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / "api.env")

MODEL_NAME = "llama-3.1-8b-instant"
# Try to import groq
try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False

router = APIRouter(prefix="/ai", tags=["AI"])

client = None
if GROQ_AVAILABLE and os.environ.get("GROQ_API_KEY"):
    client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

class SearchQuery(BaseModel):
    query: str
    free_only: bool = True

class SummaryQuery(BaseModel):
    title: str
    content_preview: str
    summary_type: str = "short"  # "short" or "detailed"

class ExportQuery(BaseModel):
    title: str
    summary_markdown: str
    format: str

def reconstruct_abstract(inverted_index):
    if not inverted_index:
        return "Abstrak tidak tersedia."
    try:
        max_idx = max([pos for positions in inverted_index.values() for pos in positions], default=-1)
        if max_idx == -1:
            return "Abstrak tidak tersedia."
        
        words = [""] * (max_idx + 1)
        for word, positions in inverted_index.items():
            for pos in positions:
                words[pos] = word
        return " ".join(words)
    except Exception:
        return "Gagal memuat abstrak."

@router.post("/search")
def search_books(query: SearchQuery):
    try:
        url = "https://api.openalex.org/works"
        
        # AI Query Optimization
        search_str = query.query.strip()
        if client and not any(op in search_str for op in [' AND ', ' OR ', '"']):
            prompt = f"""
            You are an academic search query optimizer for OpenAlex API. The user wants to search for: "{search_str}". Convert this into a precise Boolean search query for an academic database. Use AND, OR, and exact phrase quotes ("") where appropriate to ensure high relevance. For example: "Central Java" AND (tiger OR "Panthera tigris"). Only return the search string, nothing else. Do not wrap in markdown or quotes.
            """
            try:
                resp = client.chat.completions.create(
                    messages=[{"role": "user", "content": prompt}],
                    model=MODEL_NAME,
                    temperature=0.3,
                    max_tokens=60
                )
                ai_query = resp.choices[0].message.content.replace('`', '').strip()
                if ai_query:
                    search_str = ai_query
            except Exception as e:
                print(f"Error optimizing query: {e}")
        
        filter_param = "is_oa:true,has_abstract:true" if query.free_only else "has_abstract:true"
        params = {
            "search": search_str,
            "filter": filter_param,
            "per_page": 20
        }
        resp = requests.get(url, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        
        results = []
        for work in data.get("results", []):
            title = work.get("title", "Judul Tidak Diketahui")
            if title:
                title = html.unescape(title)
                title = re.sub(r'<[^>]+>', '', title)
            
            authorships = work.get("authorships", [])
            authors = [a.get("author", {}).get("display_name", "") for a in authorships if a.get("author")]
            author_str = ", ".join(authors) if authors else "Penulis Tidak Diketahui"
            
            doc_type = work.get("type", "Article")
            lang_code = work.get("language")
            
            # Prefer best OA location if available, otherwise fallback to primary location
            best_loc = work.get("best_oa_location")
            primary_loc = work.get("primary_location") or {}
            loc = best_loc if best_loc else primary_loc
            
            source_url = loc.get("pdf_url") or loc.get("landing_page_url") or ""
            
            abstract_inv = work.get("abstract_inverted_index")
            content_preview = reconstruct_abstract(abstract_inv)
            if content_preview:
                content_preview = html.unescape(content_preview)
                content_preview = re.sub(r'<[^>]+>', '', content_preview)
            
            # Detect language accurately based on text content
            detected_lang = lang_code
            text_for_detection = f"{title} {content_preview if content_preview != 'Abstrak tidak tersedia.' else ''}".strip()
            if text_for_detection:
                try:
                    from langdetect import detect
                    detected_lang = detect(text_for_detection)
                except Exception:
                    pass
            
            # Translate abstract to Indonesian
            if content_preview and content_preview != "Abstrak tidak tersedia.":
                try:
                    from deep_translator import GoogleTranslator
                    content_preview = GoogleTranslator(source='auto', target='id').translate(content_preview)
                except Exception as e:
                    print(f"Error translating abstract: {e}")

            lang_map = {
                "en": "English", "id": "Indonesian", "ko": "Korean",
                "ja": "Japanese", "zh-cn": "Chinese", "zh-tw": "Chinese",
                "zh": "Chinese", "fr": "French", "de": "German",
                "es": "Spanish", "ru": "Russian", "ar": "Arabic",
                "pt": "Portuguese", "it": "Italian", "nl": "Dutch",
                "tr": "Turkish", "pl": "Polish", "vi": "Vietnamese",
                "th": "Thai", "hi": "Hindi", "ms": "Malay", "tl": "Tagalog"
            }
            lang = lang_map.get(detected_lang, detected_lang.upper() if detected_lang else "Unknown")
            
            oa_info = work.get("open_access", {})
            oa_status = oa_info.get("oa_status", "closed")
            # All these statuses, including bronze, are free to read
            is_oa = oa_info.get("is_oa", False)
            
            results.append({
                "title": title,
                "author": author_str,
                "type": doc_type,
                "language": lang,
                "source_url": source_url,
                "content_preview": content_preview,
                "is_oa": is_oa
            })
            
        return {"results": results}
        
    except Exception as e:
        print(f"Error fetching from OpenAlex: {e}")
        raise HTTPException(status_code=500, detail="Gagal mencari literatur dari OpenAlex API.")

import xml.etree.ElementTree as ET

@router.post("/news")
def search_news(query: SearchQuery):
    try:
        search_str = query.query.strip()
        # Optimize query for news (optional, but we'll use raw for google news)
        url = f"https://news.google.com/rss/search?q={search_str}&hl=id&gl=ID&ceid=ID:id"
        
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        
        root = ET.fromstring(resp.text)
        results = []
        
        # Parse top 20 items
        for item in root.findall('.//item')[:20]:
            title = item.find('title').text if item.find('title') is not None else "Judul Tidak Diketahui"
            link = item.find('link').text if item.find('link') is not None else ""
            pub_date = item.find('pubDate').text if item.find('pubDate') is not None else ""
            source_elem = item.find('source')
            source = source_elem.text if source_elem is not None else "Berita Universal"
            
            # Clean up title (Google appends ' - Source' at the end)
            clean_title = title.rsplit(' - ', 1)[0] if ' - ' in title else title
            
            # Use title as content preview since full text isn't in RSS
            content_preview = f"HEADLINE BERITA: {clean_title}"
            
            results.append({
                "title": clean_title,
                "author": source,
                "type": "Berita",
                "language": "Indonesian",
                "source_url": link,
                "content_preview": content_preview,
                "is_oa": True # Always free to access
            })
            
        return {"results": results}
        
    except Exception as e:
        print(f"News Search error: {e}")
        raise HTTPException(status_code=500, detail="Gagal mengambil berita terbaru")

@router.post("/summarize")
def summarize_book(query: SummaryQuery):
    if not client:
        return {"summary": f"MOCK SUMMARY: Ini adalah ringkasan singkat dari bacaan '{query.title}'. Membahas tentang hal yang sangat relevan secara mendalam namun mudah dipahami."}

    if query.summary_type == "detailed":
        prompt = f"""
        You are an expert analyst and journalist. Provide a highly detailed, comprehensive, and clear summary of the following document.
        Title: {query.title}
        Content Preview: {query.content_preview}
        
        Your summary MUST:
        1. Be structured using Markdown (headings, bold text, bullet points).
        2. Deeply analyze the core concepts and main takeaways.
        3. Be written in Indonesian (Bahasa Indonesia).
        4. Provide a lengthy and comprehensive explanation of every detail mentioned.
        5. IMPORTANT: If the content preview is just a 'HEADLINE BERITA', use your general knowledge to explain the background context, implications, and analytical details of what that news topic is likely about.
        """
    else:
        prompt = f"""
        You are an expert analyst. Provide a concise summary focusing only on the main points.
        Title: {query.title}
        Content Preview: {query.content_preview}
        
        Your summary MUST:
        1. Be structured using Markdown (bullet points preferred).
        2. Highlight only the core concepts.
        3. Be brief and to the point.
        4. Be written in Indonesian (Bahasa Indonesia).
        5. IMPORTANT: If the content preview is just a 'HEADLINE BERITA', briefly explain what this news implies based on your general knowledge.
        """

    try:
        response = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model=MODEL_NAME,
            temperature=0.7,
            max_tokens=1000
        )
        return {"summary": response.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/export")
def export_summary(query: ExportQuery):
    import markdown
    html_content = markdown.markdown(query.summary_markdown)
    
    if query.format == "pdf":
        from xhtml2pdf import pisa
        from io import BytesIO
        full_html = f"<html><head><meta charset='utf-8'><title>{query.title}</title></head><body><h1>{query.title}</h1>{html_content}</body></html>"
        pdf_io = BytesIO()
        pisa_status = pisa.CreatePDF(full_html, dest=pdf_io)
        if pisa_status.err:
            raise HTTPException(status_code=500, detail="Failed to generate PDF")
        
        pdf_bytes = pdf_io.getvalue()
        return Response(content=pdf_bytes, media_type="application/pdf")
        
    elif query.format == "docx":
        from docx import Document
        from htmldocx import HtmlToDocx
        from io import BytesIO
        
        doc = Document()
        doc.add_heading(query.title, 0)
        
        new_parser = HtmlToDocx()
        new_parser.add_html_to_document(html_content, doc)
        
        docx_io = BytesIO()
        doc.save(docx_io)
        docx_bytes = docx_io.getvalue()
        return Response(
            content=docx_bytes, 
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
    else:
        raise HTTPException(status_code=400, detail="Unsupported format")
