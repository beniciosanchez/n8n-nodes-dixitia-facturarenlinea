'use strict';

const SOAP_NS = 'http://schemas.xmlsoap.org/soap/envelope/';
const TNS = 'http://tempuri.org/';
const NS_CONTRACT = 'http://schemas.datacontract.org/2004/07/TES.V33.CFDI.Negocios';

function buildCredenciales(cuenta, usuario, password) {
	return `<tns:credenciales>
    <cred:Cuenta>${escXml(cuenta)}</cred:Cuenta>
    <cred:Password>${escXml(password)}</cred:Password>
    <cred:Usuario>${escXml(usuario)}</cred:Usuario>
  </tns:credenciales>`;
}

function envelope(body) {
	return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope
  xmlns:soap="${SOAP_NS}"
  xmlns:tns="${TNS}"
  xmlns:cred="${NS_CONTRACT}">
  <soap:Header/>
  <soap:Body>
    ${body}
  </soap:Body>
</soap:Envelope>`;
}

function escXml(val) {
	if (val === null || val === undefined) return '';
	const str = String(val);
	// If value looks like XML, wrap in CDATA
	if (str.trim().startsWith('<')) return `<![CDATA[${str}]]>`;
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

/**
 * Recursively convert a JS object to XML elements under the given namespace prefix.
 * Keys starting with '@' become XML attributes.
 * Arrays are serialized as repeated sibling elements.
 */
function objToXml(tagName, obj, ns = 'tns') {
	if (obj === null || obj === undefined) return '';
	if (typeof obj !== 'object') {
		return `<${ns}:${tagName}>${escXml(obj)}</${ns}:${tagName}>`;
	}
	if (Array.isArray(obj)) {
		return obj.map((item) => objToXml(tagName, item, ns)).join('');
	}
	const attrs = [];
	const children = [];
	for (const [key, val] of Object.entries(obj)) {
		if (key.startsWith('@')) {
			attrs.push(`${key.slice(1)}="${escXml(val)}"`);
		} else if (Array.isArray(val)) {
			val.forEach((item) => children.push(objToXml(key, item, ns)));
		} else if (typeof val === 'object' && val !== null) {
			children.push(objToXml(key, val, ns));
		} else {
			children.push(`<${ns}:${key}>${escXml(val)}</${ns}:${key}>`);
		}
	}
	const attrStr = attrs.length ? ' ' + attrs.join(' ') : '';
	if (children.length === 0) return `<${ns}:${tagName}${attrStr}/>`;
	return `<${ns}:${tagName}${attrStr}>${children.join('')}</${ns}:${tagName}>`;
}

/** Get inner text of the first matching tag (namespace-agnostic) */
function getTag(xml, tag) {
	const re = new RegExp(`<(?:[^:>]+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:[^:>]+:)?${tag}>`, 'i');
	const m = xml.match(re);
	return m ? m[1].trim() : null;
}

/** Get all occurrences of a tag as an array */
function getAllTags(xml, tag) {
	const re = new RegExp(`<(?:[^:>]+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:[^:>]+:)?${tag}>`, 'gi');
	const results = [];
	let m;
	while ((m = re.exec(xml)) !== null) {
		results.push(m[1].trim());
	}
	return results;
}

/**
 * Parse RespuestaOperacionCR
 * Fields per official spec: CBB, CodigoConfirmacion, ErrorDetallado, ErrorGeneral,
 * FechaGenerada, FolioGenerado, OperacionExitosa, PDF, XML, Addenda
 */
function parseRespuestaOperacion(xml) {
	const errorGeneral = getTag(xml, 'ErrorGeneral');
	const operacionExitosa = getTag(xml, 'OperacionExitosa');
	const ok = operacionExitosa === 'true';
	return {
		xml: getTag(xml, 'XML'),
		pdf: getTag(xml, 'PDF'),
		cbb: getTag(xml, 'CBB'),
		folioGenerado: getTag(xml, 'FolioGenerado'),
		fechaGenerada: getTag(xml, 'FechaGenerada'),
		codigoConfirmacion: getTag(xml, 'CodigoConfirmacion'),
		addenda: getTag(xml, 'Addenda'),
		errorGeneral: errorGeneral || null,
		errorDetallado: getTag(xml, 'ErrorDetallado'),
		ok,
	};
}

/**
 * Parse RespuestaCancelacionCR
 * Fields per official spec: Acuse, ErrorGeneral, OperacionExitosa
 */
function parseRespuestaCancelacion(xml) {
	const errorGeneral = getTag(xml, 'ErrorGeneral');
	const operacionExitosa = getTag(xml, 'OperacionExitosa');
	const ok = operacionExitosa === 'true';
	return {
		acuse: getTag(xml, 'Acuse'),
		errorGeneral: errorGeneral || null,
		errorDetallado: getTag(xml, 'ErrorDetallado'),
		ok,
	};
}

/**
 * Parse list responses (ObtenerComprobantes40, ObtenerTickets, ObtenerSolicitudes)
 * Real tag from service: <a:ListaComprobantes><a:RegistroCFDICR>...
 * Fields per real response: UUID, Estado, FechaTimbrado, RFCReceptor
 */
function parseRespuestaReporte(xml) {
	const errorGeneral = getTag(xml, 'ErrorGeneral');
	const operacionExitosa = getTag(xml, 'OperacionExitosa');
	const ok = operacionExitosa === 'true';
	const listaXml = getTag(xml, 'ListaComprobantes') || '';
	const items = getAllTags(listaXml, 'RegistroCFDICR').map((item) => ({
		uuid: getTag(item, 'UUID'),
		estado: getTag(item, 'Estado'),
		fechaTimbrado: getTag(item, 'FechaTimbrado'),
		rfcReceptor: getTag(item, 'RFCReceptor'),
	}));
	return {
		items,
		totalComprobantes: getTag(xml, 'TotalComprobantesPeriodo'),
		errorGeneral: errorGeneral || null,
		ok,
	};
}

/**
 * Parse ObtenerNumerosCreditos response
 * Fields per official spec: CreditosRestantes, CreditosUsados, ErrorGeneral, OperacionExitosa
 */
function parseNumerosCreditos(xml) {
	const errorGeneral = getTag(xml, 'ErrorGeneral');
	const operacionExitosa = getTag(xml, 'OperacionExitosa');
	const ok = operacionExitosa === 'true';
	return {
		creditosRestantes: getTag(xml, 'CreditosRestantes'),
		creditosUsados: getTag(xml, 'CreditosUsados'),
		errorGeneral: errorGeneral || null,
		errorDetallado: getTag(xml, 'ErrorDetallado'),
		ok,
	};
}

module.exports = {
	envelope,
	buildCredenciales,
	escXml,
	objToXml,
	getTag,
	getAllTags,
	parseRespuestaOperacion,
	parseRespuestaCancelacion,
	parseRespuestaReporte,
	parseNumerosCreditos,
};