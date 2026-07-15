import requests
url = 'https://api.openalex.org/works'
def get_res(q):
    r = requests.get(url, params={'search': q, 'per_page': 5})
    return [w.get('title') for w in r.json().get('results', [])]

print('Normal:', get_res('central java tiger'))
print('AND:', get_res('central AND java AND tiger'))
print('Quotes:', get_res('"central java tiger"'))
