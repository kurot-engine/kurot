import { URLRequest, URLRequestHeader, URLRequestMethod } from '@kurot/game';

const req = new URLRequest('https://example.com/data.json');
req.method = URLRequestMethod.POST;
req.data = JSON.stringify({ key: 'value' });
req.requestHeaders.push(new URLRequestHeader('Content-Type', 'application/json'));

export {};
