import axios from 'axios';
import { parseStringPromise } from 'xml2js';

// ─── ENDPOINTS ───────────────────────────────────────────────────────────────

// Timbrado WSCFDI33
export const WSDL_TIMBRADO_PRODUCTION = 'https://www.fel.mx/WSTimbrado33/WSCFDI33.svc?WSDL';
export const WSDL_TIMBRADO_SANDBOX    = 'https://app.fel.mx/WSTimbrado33Test/WSCFDI33.svc?WSDL';

// Conexión Remota CR33
export const WSDL_CR_PRODUCTION = 'https://www.fel.mx/CR33/ConexionRemota.svc?WSDL';
export const WSDL_CR_SANDBOX    = 'https://app.fel.mx/CR33Test/ConexionRemota.svc?WSDL';

// Namespaces
const NS_TEMPURI  = 'http://tempuri.org/';
const NS_CONTRACT = 'http://schemas.datacontract.org/2004/07/TES.V33.CFDI.Negocios';

// ─── URL HELPERS ─────────────────────────────────────────────────────────────

export function getTimbradoEndpoint(environment: string): string {
  return environment === 'production'
    ? 'https://www.fel.mx/WSTimbrado33/WSCFDI33.svc'
    : 'https://app.fel.mx/WSTimbrado33Test/WSCFDI33.svc';
}

export function getConexionRemotaEndpoint(environment: string): string {
  return environment === 'production'
    ? 'https://www.fel.mx/CR33/ConexionRemota.svc'
    : 'https://app.fel.mx/CR33Test/ConexionRemota.svc';
}

// ─── SOAP ENVELOPE BUILDERS ──────────────────────────────────────────────────

/**
 * Builds a SOAP envelope for Timbrado (WSCFDI33).
 * Credentials are flat parameters: usuario, password.
 */
export function buildTimbradoEnvelope(method: string, params: Record<string, string>): string {
  const paramsXml = Object.entries(params)
    .map(([key, value]) => `<fel:${key}>${escapeXml(String(value ?? ''))}</fel:${key}>`)
    .join('\n        ');

  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:fel="${NS_TEMPURI}">
  <soap:Header/>
  <soap:Body>
    <fel:${method}>
      ${paramsXml}
    </fel:${method}>
  </soap:Body>
</soap:Envelope>`;
}

/**
 * Builds a SOAP envelope for Conexión Remota (CR33).
 * Credentials are wrapped in a <credenciales> object with the data contract namespace.
 * Non-credential params are passed flat under the tempuri namespace.
 */
export function buildConexionRemotaEnvelope(
  method: string,
  credentials: { cuenta: string; usuario: string; password: string },
  params: Record<string, string> = {},
): string {
  const extraParamsXml = Object.entries(params)
    .map(([key, value]) => `<tns:${key}>${escapeXml(String(value ?? ''))}</tns:${key}>`)
    .join('\n      ');

  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="${NS_TEMPURI}"
               xmlns:cred="${NS_CONTRACT}">
  <soap:Header/>
  <soap:Body>
    <tns:${method}>
      <tns:credenciales>
        <cred:Cuenta>${escapeXml(credentials.cuenta)}</cred:Cuenta>
        <cred:Password>${escapeXml(credentials.password)}</cred:Password>
        <cred:Usuario>${escapeXml(credentials.usuario)}</cred:Usuario>
      </tns:credenciales>
      ${extraParamsXml}
    </tns:${method}>
  </soap:Body>
</soap:Envelope>`;
}

// ─── REQUEST FUNCTIONS ───────────────────────────────────────────────────────

/**
 * Sends a SOAP request to the Timbrado (WSCFDI33) service.
 */
export async function soapRequest(
  environment: string,
  method: string,
  params: Record<string, string>,
): Promise<Record<string, unknown>> {
  const endpoint = getTimbradoEndpoint(environment);
  const envelope = buildTimbradoEnvelope(method, params);

  return executeSoapRequest(endpoint, envelope, `${NS_TEMPURI}IWSCFDI33/${method}`, method);
}

/**
 * Sends a SOAP request to the Conexión Remota (CR33) service.
 */
export async function soapRequestCR(
  environment: string,
  method: string,
  credentials: { cuenta: string; usuario: string; password: string },
  params: Record<string, string> = {},
): Promise<Record<string, unknown>> {
  const endpoint = getConexionRemotaEndpoint(environment);
  const envelope = buildConexionRemotaEnvelope(method, credentials, params);

  return executeSoapRequest(endpoint, envelope, `${NS_TEMPURI}IConexionRemota/${method}`, method);
}

/**
 * Core HTTP + parse logic shared by both services.
 */
async function executeSoapRequest(
  endpoint: string,
  envelope: string,
  soapAction: string,
  method: string,
): Promise<Record<string, unknown>> {
  const response = await axios.post(endpoint, envelope, {
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: soapAction,
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

  const resultKey  = `${method}Response`;
  const resultKey2 = `${method}Result`;

  const methodResponse = body[resultKey] || body[`a:${resultKey}`];
  if (!methodResponse) {
    throw new Error(`Respuesta inesperada del servicio FEL: no se encontró ${resultKey}`);
  }

  const result = methodResponse[resultKey2] || methodResponse[`a:${resultKey2}`] || methodResponse;
  return flattenSoapResult(result);
}

// ─── UTILITIES ───────────────────────────────────────────────────────────────

/**
 * Recursively strips SOAP namespace prefixes from keys (e.g. "a:UUID" → "UUID").
 */
function flattenSoapResult(obj: unknown): Record<string, unknown> {
  if (typeof obj !== 'object' || obj === null) return {};
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const cleanKey = key.includes(':') ? key.split(':').pop()! : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[cleanKey] = flattenSoapResult(value);
    } else {
      result[cleanKey] = value;
    }
  }
  return result;
}

/**
 * Escapes XML special characters. If the value looks like XML, wraps it in CDATA.
 */
function escapeXml(str: string): string {
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
