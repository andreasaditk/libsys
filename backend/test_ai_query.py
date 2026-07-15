import os
from dotenv import load_dotenv
from groq import Groq
load_dotenv('api.env')
client = Groq(api_key=os.environ.get('GROQ_API_KEY'))
prompt = '''You are an academic search query optimizer for OpenAlex API. The user wants to search for: "central java tiger". Convert this into a precise Boolean search query for an academic database. Use AND, OR, and exact phrase quotes ("") where appropriate to ensure high relevance. For example: "Central Java" AND (tiger OR "Panthera tigris"). Only return the search string, nothing else. Do not wrap in markdown or quotes.'''
resp = client.chat.completions.create(
    messages=[{'role': 'user', 'content': prompt}],
    model='llama-3.1-8b-instant',
    temperature=0.3,
    max_tokens=50
)
import requests
url = 'https://api.openalex.org/works'
r = requests.get(url, params={'search': resp.choices[0].message.content.strip(), 'per_page': 5})
print([w.get('title') for w in r.json().get('results', [])])
