import axios from 'axios';
import { parseStringPromise } from 'xml2js';

export const WSDL_PRODUCTION = 'https://www.fel.mx/WSTimbrado33/WSCFDI33.svc?WSDL';
export const WSDL_SANDBOX = 'https://app.fel.mx/WSTimbrado33Test/WSCFDI33.svc?WSDL';

export function getWsdlUrl(environment: string): string {
  return environment === 'production' ? WSDL_PRODUCTION : WSDL_SANDBOX;
}

export function getSoapEndpoint(environment: string): string {
  return environment === 'production'
    ? 'https://www.fel.mx/WSTimbrado33/WSCFDI33.svc'
    : 'https://app.fel.mx/WSTimbrado33Test/WSCFDI33.svc';
}

/**
 * Builds a SOAP envelope for a given FEL method and parameters.
 */
export function buildSoapEnvelope(method: string, params: Record<string, string>): string {
  const paramsXml = Object.entries(params)
    .map(([key, value]) => `<fel:${key}>${escapeXml(String(value ?? ''))}</fel:${key}>`)
    .join('\n        ');

  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:fel="http://tempuri.org/">
  <soap:Header/>
  <soap:Body>
    <fel:${method}>
      ${paramsXml}
    </fel:${method}>
  </soap:Body>
</soap:Envelope>`;
}

/**
 * Sends a SOAP request to FEL and returns parsed response.
 */
export async function soapRequest(
  environment: string,
  method: string,
  params: Record<string, string>,
): Promise<Record<string, unknown>> {
  const endpoint = getSoapEndpoint(environment);
  const envelope = buildSoapEnvelope(method, params);

  const response = await axios.post(endpoint, envelope, {
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: `http://tempuri.org/IWSCFDI33/${method}`,
    },
    timeout: 30000,
  });

  const parsed = await parseStringPromise(response.data, {
    explicitArray: false,
    ignoreAttrs: false,
  });

  // Navigate through the SOAP envelope
  const body =
    parsed?.['s:Envelope']?.['s:Body'] ||
    parsed?.['soap:Envelope']?.['soap:Body'] ||
    parsed?.Envelope?.Body;

  if (!body) {
    throw new Error('No se pudo parsear la respuesta SOAP de FEL');
  }

  const resultKey = `${method}Response`;
  const resultKey2 = `${method}Result`;

  const methodResponse = body[resultKey] || body[`a:${resultKey}`];
  if (!methodResponse) {
    throw new Error(`Respuesta inesperada del servicio FEL: no se encontró ${resultKey}`);
  }

  const result = methodResponse[resultKey2] || methodResponse[`a:${resultKey2}`] || methodResponse;
  return flattenSoapResult(result);
}

/**
 * Recursively flattens SOAP namespace prefixes from keys.
 */
function flattenSoapResult(obj: unknown): Record<string, unknown> {
  if (typeof obj !== 'object' || obj === null) return {};

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    // Strip namespace prefixes like "a:", "b:", etc.
    const cleanKey = key.includes(':') ? key.split(':').pop()! : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[cleanKey] = flattenSoapResult(value);
    } else {
      result[cleanKey] = value;
    }
  }
  return result;
}

function escapeXml(str: string): string {
  // If the string looks like XML (starts with <?xml or <cfdi:), don't escape it.
  // Instead wrap it in CDATA so it's transmitted as-is.
  if (str.trim().startsWith('<')) {
    return `<![CDATA[${str}]]>`;
  }
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
