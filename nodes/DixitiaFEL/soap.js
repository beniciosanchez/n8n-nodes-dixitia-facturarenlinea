'use strict';

const SOAP_NS = 'http://schemas.xmlsoap.org/soap/envelope/';
const TNS = 'http://tempuri.org/';

function buildCredenciales(cuenta, usuario, password) {
	return `<tns:credenciales>
    <tns:Cuenta>${escXml(cuenta)}</tns:Cuenta>
    <tns:Usuario>${escXml(usuario)}</tns:Usuario>
    <tns:Password>${escXml(password)}</tns:Password>
  </tns:credenciales>`;
}

function envelope(body) {
	return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope
  xmlns:soap="${SOAP_NS}"
  xmlns:tns="${TNS}">
  <soap:Body>
    ${body}
  </soap:Body>
</soap:Envelope>`;
}

function escXml(val) {
	if (val === null || val === undefined) return '';
	return String(val)
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

/** Parse a RespuestaOperacionCR block */
function parseRespuestaOperacion(xml) {
	const codigoError = getTag(xml, 'CodigoError');
	return {
		xml: getTag(xml, 'XML'),
		pdf: getTag(xml, 'PDF'),
		cbb: getTag(xml, 'CBB'),
		uuid: getTag(xml, 'UUID'),
		folio: getTag(xml, 'Folio'),
		serie: getTag(xml, 'Serie'),
		fechaTimbrado: getTag(xml, 'FechaTimbrado'),
		noCertificadoSat: getTag(xml, 'NoCertificadoSat'),
		noCertificadoEmisor: getTag(xml, 'NoCertificadoEmisor'),
		selloCFD: getTag(xml, 'SelloCFD'),
		selloSAT: getTag(xml, 'SelloSAT'),
		cadenaOriginal: getTag(xml, 'CadenaOriginal'),
		codigoError,
		descripcionError: getTag(xml, 'DescripcionError'),
		mensajeError: getTag(xml, 'MensajeError'),
		ok: !codigoError || codigoError === '',
	};
}

/** Parse a RespuestaCancelacionCR block */
function parseRespuestaCancelacion(xml) {
	const codigoError = getTag(xml, 'CodigoError');
	return {
		acuse: getTag(xml, 'Acuse'),
		codigoError,
		descripcionError: getTag(xml, 'DescripcionError'),
		mensajeError: getTag(xml, 'MensajeError'),
		ok: !codigoError || codigoError === '',
	};
}

/** Parse a RespuestaReporteCR block */
function parseRespuestaReporte(xml) {
	const items = getAllTags(xml, 'ReporteCFDI').map((item) => ({
		uuid: getTag(item, 'UUID'),
		serie: getTag(item, 'Serie'),
		folio: getTag(item, 'Folio'),
		fechaTimbrado: getTag(item, 'FechaTimbrado'),
		receptor: getTag(item, 'Receptor'),
		total: getTag(item, 'Total'),
		tipoComprobante: getTag(item, 'TipoComprobante'),
		status: getTag(item, 'Status'),
	}));
	const codigoError = getTag(xml, 'CodigoError');
	return {
		items,
		codigoError,
		descripcionError: getTag(xml, 'DescripcionError'),
		ok: !codigoError || codigoError === '',
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
};
