'use strict';

const {
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
} = require('./soap');

const ENDPOINT_PROD = 'https://fel.mx/CR33/ConexionRemota.svc';
const ENDPOINT_TEST = 'http://app.fel.mx/CR33Test/ConexionRemota.svc';
const ACTION_BASE = 'http://tempuri.org/IConexionRemota/';

class DixitiaFEL {
	constructor() {
		this.description = {
			displayName: 'Dixitia-FEL',
			name: 'dixitiaFEL',
			icon: 'file:dixitiaFEL.svg',
			group: ['transform'],
			version: 1,
			subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
			description: 'Facturación electrónica CFDI vía el servicio FEL ConexionRemota de Dixitia',
			defaults: { name: 'Dixitia-FEL' },
			inputs: ['main'],
			outputs: ['main'],
			credentials: [{ name: 'dixitiaFELApi', required: true }],
			properties: [

				// ── Environment ──────────────────────────────────────────
				{
					displayName: 'Environment',
					name: 'environment',
					type: 'options',
					options: [
						{ name: 'Production', value: 'prod' },
						{ name: 'Test', value: 'test' },
					],
					default: 'prod',
				},

				// ── Resource ─────────────────────────────────────────────
				{
					displayName: 'Resource',
					name: 'resource',
					type: 'options',
					noDataExpression: true,
					options: [
						{ name: 'CFDI', value: 'cfdi' },
						{ name: 'Ticket', value: 'ticket' },
						{ name: 'Crédito', value: 'credit' },
						{ name: 'Cancelación (Receptor)', value: 'cancelacionReceptor' },
						{ name: 'Utilidad', value: 'utility' },
					],
					default: 'cfdi',
				},

				// ════════════════════════════════════════════════════════
				// CFDI operations
				// ════════════════════════════════════════════════════════
				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					noDataExpression: true,
					displayOptions: { show: { resource: ['cfdi'] } },
					options: [
						{ name: 'Generar CFDI 4.0', value: 'generarCFDI40' },
						{ name: 'Cancelar CFDIs v4', value: 'cancelarCFDIsV4' },
						{ name: 'Obtener PDF 4.0', value: 'obtenerPDF40' },
						{ name: 'Obtener XML por UUID 4.0', value: 'obtenerXMLPorUUID40' },
						{ name: 'Obtener XML por Referencia 4.0', value: 'obtenerXMLPorReferencia40' },
						{ name: 'Obtener Acuse Cancelación 4.0', value: 'obtenerAcuseCancelacion40' },
						{ name: 'Obtener Acuse Envío 4.0', value: 'obtenerAcuseEnvio40' },
						{ name: 'Enviar CFDI 4.0', value: 'enviarCFDI40' },
						{ name: 'Obtener Comprobantes 4.0', value: 'obtenerComprobantes40' },
					],
					default: 'generarCFDI40',
				},

				// ════════════════════════════════════════════════════════
				// Ticket operations
				// ════════════════════════════════════════════════════════
				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					noDataExpression: true,
					displayOptions: { show: { resource: ['ticket'] } },
					options: [
						{ name: 'Generar Ticket 4.0', value: 'generarTicket40' },
						{ name: 'Obtener Tickets', value: 'obtenerTickets' },
						{ name: 'Obtener Tickets por Estatus', value: 'obtenerTicketsPorEstatus' },
						{ name: 'Cancelar Ticket', value: 'cancelarTicket' },
					],
					default: 'generarTicket40',
				},

				// ════════════════════════════════════════════════════════
				// Crédito operations
				// ════════════════════════════════════════════════════════
				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					noDataExpression: true,
					displayOptions: { show: { resource: ['credit'] } },
					options: [
						{ name: 'Obtener Números de Créditos', value: 'obtenerNumerosCreditos' },
						{ name: 'Activar Paquete', value: 'activarPaquete' },
						{ name: 'Traspasar Paquete', value: 'traspasarPaquete' },
					],
					default: 'obtenerNumerosCreditos',
				},

				// ════════════════════════════════════════════════════════
				// Cancelación Receptor operations
				// ════════════════════════════════════════════════════════
				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					noDataExpression: true,
					displayOptions: { show: { resource: ['cancelacionReceptor'] } },
					options: [
						{ name: 'Obtener Solicitudes Cancelación', value: 'obtenerSolicitudesCancelacion' },
						{ name: 'Obtener Solicitudes Pendientes', value: 'obtenerSolicitudesPendientes' },
						{ name: 'Procesar Solicitudes Cancelación', value: 'procesarSolicitudesCancelacion' },
					],
					default: 'obtenerSolicitudesPendientes',
				},

				// ════════════════════════════════════════════════════════
				// Utility operations
				// ════════════════════════════════════════════════════════
				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					noDataExpression: true,
					displayOptions: { show: { resource: ['utility'] } },
					options: [
						{ name: 'Validar RFC', value: 'validarRFC' },
					],
					default: 'validarRFC',
				},

				// ════════════════════════════════════════════════════════
				// FIELDS
				// ════════════════════════════════════════════════════════

				// GenerarCFDI40 — cfdi object
				{
					displayName: 'CFDI JSON',
					name: 'cfdiJson',
					type: 'json',
					displayOptions: { show: { resource: ['cfdi'], operation: ['generarCFDI40'] } },
					default: '{}',
					required: true,
					description: 'Objeto Comprobante40R completo como JSON. Ver documentación oficial para la estructura.',
				},

				// UUID (lowercase per spec) — shared
				{
					displayName: 'UUID',
					name: 'uuid',
					type: 'string',
					displayOptions: {
						show: {
							resource: ['cfdi'],
							operation: ['obtenerPDF40', 'obtenerXMLPorUUID40', 'obtenerAcuseCancelacion40', 'obtenerAcuseEnvio40', 'enviarCFDI40'],
						},
					},
					default: '',
					required: true,
					description: 'UUID / Folio Fiscal del CFDI (formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
				},

				// nombrePlantilla — optional for ObtenerPDF40
				{
					displayName: 'Nombre Plantilla (opcional)',
					name: 'nombrePlantilla',
					type: 'string',
					displayOptions: { show: { resource: ['cfdi'], operation: ['obtenerPDF40'] } },
					default: '',
					description: 'Nombre de la plantilla configurada en el Sistema en línea',
				},

				// referencia — ObtenerXMLPorReferencia40
				{
					displayName: 'Referencia',
					name: 'referencia',
					type: 'string',
					displayOptions: { show: { resource: ['cfdi'], operation: ['obtenerXMLPorReferencia40'] } },
					default: '',
					required: true,
					description: 'Referencia única usada para emitir el CFDI (máx. 32 caracteres)',
				},

				// EnviarCFDI40 extra fields
				{
					displayName: 'Email(s)',
					name: 'email',
					type: 'string',
					displayOptions: { show: { resource: ['cfdi'], operation: ['enviarCFDI40'] } },
					default: '',
					required: true,
					description: 'Hasta 3 correos separados por coma',
				},
				{
					displayName: 'Título del correo',
					name: 'titulo',
					type: 'string',
					displayOptions: { show: { resource: ['cfdi'], operation: ['enviarCFDI40'] } },
					default: '',
					description: 'Título del correo (puede ir vacío)',
				},
				{
					displayName: 'Mensaje del correo',
					name: 'mensaje',
					type: 'string',
					typeOptions: { rows: 3 },
					displayOptions: { show: { resource: ['cfdi'], operation: ['enviarCFDI40'] } },
					default: '',
					description: 'Cuerpo del correo (puede ir vacío)',
				},
				{
					displayName: 'Nombre Plantilla (opcional)',
					name: 'nombrePlantillaEnviar',
					type: 'string',
					displayOptions: { show: { resource: ['cfdi'], operation: ['enviarCFDI40'] } },
					default: '',
					description: 'Plantilla configurada en el Sistema en línea',
				},

				// CancelarCFDIsV4
				{
					displayName: 'UUIDs a Cancelar (JSON Array)',
					name: 'uuidsCancelar',
					type: 'json',
					displayOptions: { show: { resource: ['cfdi'], operation: ['cancelarCFDIsV4'] } },
					default: '[{"UUID":"","Motivo":"02","FolioSustitucion":""}]',
					required: true,
					description: 'Array de objetos con UUID (requerido), Motivo (01-04) y FolioSustitucion (solo Motivo 01). Máx. 500.',
				},

				// ObtenerComprobantes40
				{
					displayName: 'Fecha Inicial',
					name: 'fechaInicial',
					type: 'string',
					displayOptions: { show: { resource: ['cfdi'], operation: ['obtenerComprobantes40'] } },
					default: '',
					required: true,
					placeholder: 'YYYY-MM-DDTHH:mm:ss',
					description: 'Fecha inicial. Período máximo 1 mes.',
				},
				{
					displayName: 'Fecha Final',
					name: 'fechaFinal',
					type: 'string',
					displayOptions: { show: { resource: ['cfdi'], operation: ['obtenerComprobantes40'] } },
					default: '',
					required: true,
					placeholder: 'YYYY-MM-DDTHH:mm:ss',
				},
				{
					displayName: 'Fila Inicial',
					name: 'filaInicial',
					type: 'number',
					displayOptions: { show: { resource: ['cfdi'], operation: ['obtenerComprobantes40'] } },
					default: 1,
					description: 'Registro inicial para paginar. Incrementar de 20 en 20.',
				},

				// ════════════════════════════════════════════════════════
				// TICKET FIELDS
				// ════════════════════════════════════════════════════════
				{
					displayName: 'Ticket JSON',
					name: 'ticketJson',
					type: 'json',
					displayOptions: { show: { resource: ['ticket'], operation: ['generarTicket40'] } },
					default: '{}',
					required: true,
					description: 'Objeto Ticket40R como JSON',
				},
				{
					displayName: 'Fecha Inicial',
					name: 'ticketFechaInicial',
					type: 'string',
					displayOptions: { show: { resource: ['ticket'], operation: ['obtenerTickets', 'obtenerTicketsPorEstatus'] } },
					default: '',
					required: true,
					placeholder: 'YYYY-MM-DDTHH:mm:ss',
				},
				{
					displayName: 'Fecha Final',
					name: 'ticketFechaFinal',
					type: 'string',
					displayOptions: { show: { resource: ['ticket'], operation: ['obtenerTickets', 'obtenerTicketsPorEstatus'] } },
					default: '',
					required: true,
					placeholder: 'YYYY-MM-DDTHH:mm:ss',
				},
				{
					displayName: 'Fila Inicial',
					name: 'ticketFilaInicial',
					type: 'number',
					displayOptions: { show: { resource: ['ticket'], operation: ['obtenerTickets', 'obtenerTicketsPorEstatus'] } },
					default: 1,
				},
				{
					displayName: 'Tamaño de Página',
					name: 'tamanoPagina',
					type: 'number',
					displayOptions: { show: { resource: ['ticket'], operation: ['obtenerTicketsPorEstatus'] } },
					default: 20,
					description: 'Número de registros por página',
				},
				{
					displayName: 'Estatus',
					name: 'ticketEstatus',
					type: 'options',
					options: [
						{ name: 'Nuevo', value: 'NUEVO' },
						{ name: 'Facturado', value: 'FACTURADO' },
					],
					displayOptions: { show: { resource: ['ticket'], operation: ['obtenerTicketsPorEstatus'] } },
					default: 'NUEVO',
				},
				{
					displayName: 'Referencia del Ticket',
					name: 'ticketReferencia',
					type: 'string',
					displayOptions: { show: { resource: ['ticket'], operation: ['cancelarTicket'] } },
					default: '',
					required: true,
					description: 'Referencia del ticket generado a cancelar (máx. 32 caracteres)',
				},

				// ════════════════════════════════════════════════════════
				// CRÉDITO FIELDS
				// ════════════════════════════════════════════════════════
				{
					displayName: 'Número de Créditos',
					name: 'numCreditos',
					type: 'number',
					displayOptions: { show: { resource: ['credit'], operation: ['activarPaquete', 'traspasarPaquete'] } },
					default: 0,
					required: true,
					description: 'Número de créditos del paquete a activar o traspasar',
				},
				{
					displayName: 'Cuenta Destino',
					name: 'cuentaDestino',
					type: 'string',
					displayOptions: { show: { resource: ['credit'], operation: ['traspasarPaquete'] } },
					default: '',
					required: true,
					description: 'Cuenta destino para el traspaso',
				},

				// ════════════════════════════════════════════════════════
				// CANCELACIÓN RECEPTOR FIELDS
				// ════════════════════════════════════════════════════════
				{
					displayName: 'Fecha Inicial',
					name: 'solicitudFechaInicial',
					type: 'string',
					displayOptions: { show: { resource: ['cancelacionReceptor'], operation: ['obtenerSolicitudesCancelacion'] } },
					default: '',
					required: true,
					placeholder: 'YYYY-MM-DDTHH:mm:ss',
					description: 'Período máximo 31 días',
				},
				{
					displayName: 'Fecha Final',
					name: 'solicitudFechaFinal',
					type: 'string',
					displayOptions: { show: { resource: ['cancelacionReceptor'], operation: ['obtenerSolicitudesCancelacion'] } },
					default: '',
					required: true,
					placeholder: 'YYYY-MM-DDTHH:mm:ss',
				},
				{
					displayName: 'Fila Inicial',
					name: 'solicitudFilaInicial',
					type: 'number',
					displayOptions: { show: { resource: ['cancelacionReceptor'], operation: ['obtenerSolicitudesCancelacion'] } },
					default: 1,
				},
				{
					displayName: 'Solicitudes a Procesar (JSON Array)',
					name: 'solicitudesProcesar',
					type: 'json',
					displayOptions: { show: { resource: ['cancelacionReceptor'], operation: ['procesarSolicitudesCancelacion'] } },
					default: '[{"UUID":"","Aceptar":"true"}]',
					required: true,
					description: 'Array con UUID y Aceptar (true=aceptar cancelación, false=rechazar). Máx. 500.',
				},

				// ════════════════════════════════════════════════════════
				// UTILITY FIELDS
				// ════════════════════════════════════════════════════════
				{
					displayName: 'RFC',
					name: 'rfc',
					type: 'string',
					displayOptions: { show: { resource: ['utility'], operation: ['validarRFC'] } },
					default: '',
					required: true,
					description: 'RFC a validar en la lista de Inscritos No Cancelados del SAT',
				},

				// ════════════════════════════════════════════════════════
				// Advanced options
				// ════════════════════════════════════════════════════════
				{
					displayName: 'Opciones',
					name: 'options',
					type: 'collection',
					placeholder: 'Agregar opción',
					default: {},
					options: [
						{
							displayName: 'Incluir XML crudo',
							name: 'rawXml',
							type: 'boolean',
							default: false,
							description: 'Whether to include the raw SOAP XML response (útil para depuración)',
						},
					],
				},
			],
		};
	}

	async execute() {
		const items = this.getInputData();
		const returnItems = [];
		const credentials = await this.getCredentials('dixitiaFELApi');
		const { cuenta, usuario, password } = credentials;

		for (let i = 0; i < items.length; i++) {
			const environment = this.getNodeParameter('environment', i);
			const resource = this.getNodeParameter('resource', i);
			const operation = this.getNodeParameter('operation', i);
			const options = this.getNodeParameter('options', i, {});
			const endpoint = environment === 'test' ? ENDPOINT_TEST : ENDPOINT_PROD;
			const creds = buildCredenciales(cuenta, usuario, password);

			let soapAction;
			let body;
			let responseParser;

			// ── CFDI ─────────────────────────────────────────────────
			if (resource === 'cfdi') {

				if (operation === 'generarCFDI40') {
					const raw = this.getNodeParameter('cfdiJson', i, '{}');
					const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
					soapAction = ACTION_BASE + 'GenerarCFDI40';
					body = envelope(`<tns:GenerarCFDI40>
  ${creds}
  ${objToXml('cfdi', obj)}
</tns:GenerarCFDI40>`);
					responseParser = (xml) => parseRespuestaOperacion(getTag(xml, 'GenerarCFDI40Result') || xml);
				}

				else if (operation === 'cancelarCFDIsV4') {
					const raw = this.getNodeParameter('uuidsCancelar', i, '[]');
					const uuids = typeof raw === 'string' ? JSON.parse(raw) : raw;
					const cancelXml = uuids.map((u) =>
						`<cred:UUIDMotivoCancelacionCR>
    <cred:UUID>${escXml(u.UUID || u.uuid)}</cred:UUID>
    <cred:Motivo>${escXml(u.Motivo || u.motivo || '02')}</cred:Motivo>
    ${(u.FolioSustitucion || u.folioSustitucion) ? `<cred:FolioSustitucion>${escXml(u.FolioSustitucion || u.folioSustitucion)}</cred:FolioSustitucion>` : ''}
  </cred:UUIDMotivoCancelacionCR>`).join('');
					soapAction = ACTION_BASE + 'CancelarCFDIsV4';
					body = envelope(`<tns:CancelarCFDIsV4>
  ${creds}
  <tns:uuids>${cancelXml}</tns:uuids>
</tns:CancelarCFDIsV4>`);
					responseParser = (xml) => parseRespuestaCancelacion(getTag(xml, 'CancelarCFDIsV4Result') || xml);
				}

				else if (operation === 'obtenerPDF40') {
					const uuid = this.getNodeParameter('uuid', i);
					const nombrePlantilla = this.getNodeParameter('nombrePlantilla', i, '');
					soapAction = ACTION_BASE + 'ObtenerPDF40';
					body = envelope(`<tns:ObtenerPDF40>
  ${creds}
  <tns:uuid>${escXml(uuid)}</tns:uuid>
  <tns:nombrePlantilla>${escXml(nombrePlantilla)}</tns:nombrePlantilla>
</tns:ObtenerPDF40>`);
					responseParser = (xml) => parseRespuestaOperacion(getTag(xml, 'ObtenerPDF40Result') || xml);
				}

				else if (operation === 'obtenerXMLPorUUID40') {
					const uuid = this.getNodeParameter('uuid', i);
					soapAction = ACTION_BASE + 'ObtenerXMLPorUUID40';
					body = envelope(`<tns:ObtenerXMLPorUUID40>
  ${creds}
  <tns:uuid>${escXml(uuid)}</tns:uuid>
</tns:ObtenerXMLPorUUID40>`);
					responseParser = (xml) => parseRespuestaOperacion(getTag(xml, 'ObtenerXMLPorUUID40Result') || xml);
				}

				else if (operation === 'obtenerXMLPorReferencia40') {
					const referencia = this.getNodeParameter('referencia', i);
					soapAction = ACTION_BASE + 'ObtenerXMLPorReferencia40';
					body = envelope(`<tns:ObtenerXMLPorReferencia40>
  ${creds}
  <tns:referencia>${escXml(referencia)}</tns:referencia>
</tns:ObtenerXMLPorReferencia40>`);
					responseParser = (xml) => parseRespuestaOperacion(getTag(xml, 'ObtenerXMLPorReferencia40Result') || xml);
				}

				else if (operation === 'obtenerAcuseCancelacion40') {
					const uuid = this.getNodeParameter('uuid', i);
					soapAction = ACTION_BASE + 'ObtenerAcuseCancelacion40';
					body = envelope(`<tns:ObtenerAcuseCancelacion40>
  ${creds}
  <tns:uuid>${escXml(uuid)}</tns:uuid>
</tns:ObtenerAcuseCancelacion40>`);
					responseParser = (xml) => parseRespuestaOperacion(getTag(xml, 'ObtenerAcuseCancelacion40Result') || xml);
				}

				else if (operation === 'obtenerAcuseEnvio40') {
					const uuid = this.getNodeParameter('uuid', i);
					soapAction = ACTION_BASE + 'ObtenerAcuseEnvio40';
					body = envelope(`<tns:ObtenerAcuseEnvio40>
  ${creds}
  <tns:uuid>${escXml(uuid)}</tns:uuid>
</tns:ObtenerAcuseEnvio40>`);
					responseParser = (xml) => parseRespuestaOperacion(getTag(xml, 'ObtenerAcuseEnvio40Result') || xml);
				}

				else if (operation === 'enviarCFDI40') {
					const uuid = this.getNodeParameter('uuid', i);
					const email = this.getNodeParameter('email', i);
					const titulo = this.getNodeParameter('titulo', i, '');
					const mensaje = this.getNodeParameter('mensaje', i, '');
					const nombrePlantilla = this.getNodeParameter('nombrePlantillaEnviar', i, '');
					soapAction = ACTION_BASE + 'EnviarCFDI40';
					body = envelope(`<tns:EnviarCFDI40>
  ${creds}
  <tns:uuid>${escXml(uuid)}</tns:uuid>
  <tns:email>${escXml(email)}</tns:email>
  <tns:titulo>${escXml(titulo)}</tns:titulo>
  <tns:mensaje>${escXml(mensaje)}</tns:mensaje>
  <tns:nombrePlantilla>${escXml(nombrePlantilla)}</tns:nombrePlantilla>
</tns:EnviarCFDI40>`);
					responseParser = (xml) => parseRespuestaOperacion(getTag(xml, 'EnviarCFDI40Result') || xml);
				}

				else if (operation === 'obtenerComprobantes40') {
					const fechaInicial = this.getNodeParameter('fechaInicial', i);
					const fechaFinal = this.getNodeParameter('fechaFinal', i);
					const filaInicial = this.getNodeParameter('filaInicial', i, 1);
					soapAction = ACTION_BASE + 'ObtenerComprobantes40';
					body = envelope(`<tns:ObtenerComprobantes40>
  ${creds}
  <tns:fechaInicial>${escXml(fechaInicial)}</tns:fechaInicial>
  <tns:fechaFinal>${escXml(fechaFinal)}</tns:fechaFinal>
  <tns:filaInicial>${escXml(filaInicial)}</tns:filaInicial>
</tns:ObtenerComprobantes40>`);
					responseParser = (xml) => parseRespuestaReporte(getTag(xml, 'ObtenerComprobantes40Result') || xml);
				}
			}

			// ── Ticket ───────────────────────────────────────────────
			else if (resource === 'ticket') {

				if (operation === 'generarTicket40') {
					const raw = this.getNodeParameter('ticketJson', i, '{}');
					const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
					soapAction = ACTION_BASE + 'GenerarTicket40';
					body = envelope(`<tns:GenerarTicket40>
  ${creds}
  ${objToXml('ticket', obj)}
</tns:GenerarTicket40>`);
					responseParser = (xml) => parseRespuestaOperacion(getTag(xml, 'GenerarTicket40Result') || xml);
				}

				else if (operation === 'obtenerTickets') {
					const fechaInicial = this.getNodeParameter('ticketFechaInicial', i);
					const fechaFinal = this.getNodeParameter('ticketFechaFinal', i);
					const filaInicial = this.getNodeParameter('ticketFilaInicial', i, 1);
					soapAction = ACTION_BASE + 'ObtenerTickets';
					body = envelope(`<tns:ObtenerTickets>
  ${creds}
  <tns:fechaInicial>${escXml(fechaInicial)}</tns:fechaInicial>
  <tns:fechaFinal>${escXml(fechaFinal)}</tns:fechaFinal>
  <tns:filaInicial>${escXml(filaInicial)}</tns:filaInicial>
</tns:ObtenerTickets>`);
					responseParser = (xml) => parseRespuestaReporte(getTag(xml, 'ObtenerTicketsResult') || xml);
				}

				else if (operation === 'obtenerTicketsPorEstatus') {
					const fechaInicial = this.getNodeParameter('ticketFechaInicial', i);
					const fechaFinal = this.getNodeParameter('ticketFechaFinal', i);
					const filaInicial = this.getNodeParameter('ticketFilaInicial', i, 1);
					const tamanoPagina = this.getNodeParameter('tamanoPagina', i, 20);
					const estatus = this.getNodeParameter('ticketEstatus', i);
					soapAction = ACTION_BASE + 'ObtenerTicketsPorEstatus';
					body = envelope(`<tns:ObtenerTicketsPorEstatus>
  ${creds}
  <tns:fechaInicial>${escXml(fechaInicial)}</tns:fechaInicial>
  <tns:fechaFinal>${escXml(fechaFinal)}</tns:fechaFinal>
  <tns:tamanoPagina>${escXml(tamanoPagina)}</tns:tamanoPagina>
  <tns:filaInicial>${escXml(filaInicial)}</tns:filaInicial>
  <tns:Estatus>${escXml(estatus)}</tns:Estatus>
</tns:ObtenerTicketsPorEstatus>`);
					responseParser = (xml) => parseRespuestaReporte(getTag(xml, 'ObtenerTicketsPorEstatusResult') || xml);
				}

				else if (operation === 'cancelarTicket') {
					const referencia = this.getNodeParameter('ticketReferencia', i);
					soapAction = ACTION_BASE + 'CancelarTicket';
					body = envelope(`<tns:CancelarTicket>
  ${creds}
  <tns:referencia>${escXml(referencia)}</tns:referencia>
</tns:CancelarTicket>`);
					responseParser = (xml) => parseRespuestaOperacion(getTag(xml, 'CancelarTicketResult') || xml);
				}
			}

			// ── Crédito ──────────────────────────────────────────────
			else if (resource === 'credit') {

				if (operation === 'obtenerNumerosCreditos') {
					soapAction = ACTION_BASE + 'ObtenerNumerosCreditos';
					body = envelope(`<tns:ObtenerNumerosCreditos>
  ${creds}
</tns:ObtenerNumerosCreditos>`);
					responseParser = (xml) => parseNumerosCreditos(getTag(xml, 'ObtenerNumerosCreditosResult') || xml);
				}

				else if (operation === 'activarPaquete') {
					const numCreditos = this.getNodeParameter('numCreditos', i);
					soapAction = ACTION_BASE + 'ActivarPaquete';
					body = envelope(`<tns:ActivarPaquete>
  ${creds}
  <tns:NumCreditos>${escXml(numCreditos)}</tns:NumCreditos>
</tns:ActivarPaquete>`);
					responseParser = (xml) => parseRespuestaOperacion(getTag(xml, 'ActivarPaqueteResult') || xml);
				}

				else if (operation === 'traspasarPaquete') {
					const numCreditos = this.getNodeParameter('numCreditos', i);
					const cuentaDestino = this.getNodeParameter('cuentaDestino', i);
					soapAction = ACTION_BASE + 'TraspasarPaquete';
					body = envelope(`<tns:TraspasarPaquete>
  ${creds}
  <tns:NumCreditos>${escXml(numCreditos)}</tns:NumCreditos>
  <tns:cuentaDestino>${escXml(cuentaDestino)}</tns:cuentaDestino>
</tns:TraspasarPaquete>`);
					responseParser = (xml) => parseRespuestaOperacion(getTag(xml, 'TraspasarPaqueteResult') || xml);
				}
			}

			// ── Cancelación Receptor ─────────────────────────────────
			else if (resource === 'cancelacionReceptor') {

				if (operation === 'obtenerSolicitudesCancelacion') {
					const fechaInicial = this.getNodeParameter('solicitudFechaInicial', i);
					const fechaFinal = this.getNodeParameter('solicitudFechaFinal', i);
					const filaInicial = this.getNodeParameter('solicitudFilaInicial', i, 1);
					soapAction = ACTION_BASE + 'ObtenerSolicitudesCancelacion';
					body = envelope(`<tns:ObtenerSolicitudesCancelacion>
  ${creds}
  <tns:fechaInicial>${escXml(fechaInicial)}</tns:fechaInicial>
  <tns:fechaFinal>${escXml(fechaFinal)}</tns:fechaFinal>
  <tns:filaInicial>${escXml(filaInicial)}</tns:filaInicial>
</tns:ObtenerSolicitudesCancelacion>`);
					responseParser = (xml) => parseRespuestaReporte(getTag(xml, 'ObtenerSolicitudesCancelacionResult') || xml);
				}

				else if (operation === 'obtenerSolicitudesPendientes') {
					soapAction = ACTION_BASE + 'ObtenerSolicitudesPendientes';
					body = envelope(`<tns:ObtenerSolicitudesPendientes>
  ${creds}
</tns:ObtenerSolicitudesPendientes>`);
					responseParser = (xml) => parseRespuestaReporte(getTag(xml, 'ObtenerSolicitudesPendientesResult') || xml);
				}

				else if (operation === 'procesarSolicitudesCancelacion') {
					const raw = this.getNodeParameter('solicitudesProcesar', i, '[]');
					const solicitudes = typeof raw === 'string' ? JSON.parse(raw) : raw;
					const solicitudesXml = solicitudes.map((s) =>
						`<cred:RepuestaSolicitudCancelacionCR>
    <cred:UUID>${escXml(s.UUID || s.uuid)}</cred:UUID>
    <cred:Aceptar>${escXml(s.Aceptar || s.aceptar || 'true')}</cred:Aceptar>
  </cred:RepuestaSolicitudCancelacionCR>`).join('');
					soapAction = ACTION_BASE + 'ProcesarSolicitudesCancelacion';
					body = envelope(`<tns:ProcesarSolicitudesCancelacion>
  ${creds}
  <tns:uuids>${solicitudesXml}</tns:uuids>
</tns:ProcesarSolicitudesCancelacion>`);
					responseParser = (xml) => parseRespuestaCancelacion(getTag(xml, 'ProcesarSolicitudesCancelacionResult') || xml);
				}
			}

			// ── Utility ──────────────────────────────────────────────
			else if (resource === 'utility') {

				if (operation === 'validarRFC') {
					const rfc = this.getNodeParameter('rfc', i);
					soapAction = ACTION_BASE + 'ValidarRFC';
					body = envelope(`<tns:ValidarRFC>
  ${creds}
  <tns:rfc>${escXml(rfc)}</tns:rfc>
</tns:ValidarRFC>`);
					responseParser = (xml) => {
						const result = getTag(xml, 'ValidarRFCResult') || xml;
						return {
							cancelado: getTag(result, 'Cancelado'),
							rfcLocalizado: getTag(result, 'RFCLocalizado'),
							rfc: getTag(result, 'RFC'),
							subcontratacion: getTag(result, 'Subcontratacion'),
							unidadSNCF: getTag(result, 'UnidadSNCF'),
							mensajeError: getTag(result, 'MensajeError'),
							ok: getTag(result, 'RFCLocalizado') === 'true',
						};
					};
				}
			}

			if (!body || !soapAction) {
				throw new Error(`Operación desconocida: ${resource}.${operation}`);
			}

			// ── HTTP request ─────────────────────────────────────────
			const response = await this.helpers.request({
				method: 'POST',
				url: endpoint,
				headers: {
					'Content-Type': 'text/xml; charset=utf-8',
					SOAPAction: `"${soapAction}"`,
				},
				body,
				resolveWithFullResponse: true,
			});

			const rawXmlResponse = response.body;

			if (rawXmlResponse.includes('soap:Fault') || rawXmlResponse.includes('s:Fault')) {
				const faultString = getTag(rawXmlResponse, 'faultstring') || getTag(rawXmlResponse, 'Reason') || 'SOAP Fault';
				throw new Error(`SOAP Fault: ${faultString}`);
			}

			const parsed = responseParser(rawXmlResponse);
			const outputItem = { json: parsed };
			if (options.rawXml) outputItem.json._rawXml = rawXmlResponse;

			returnItems.push(outputItem);
		}

		return [returnItems];
	}
}

module.exports = { DixitiaFEL };