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
			credentials: [
				{
					name: 'dixitiaFELApi',
					required: true,
				},
			],
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
					description: 'Which endpoint to call',
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
						{ name: 'Utilidad', value: 'utility' },
					],
					default: 'cfdi',
				},

				// ════════════════════════════════════════════════════════
				// CFDI — operations
				// ════════════════════════════════════════════════════════
				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					noDataExpression: true,
					displayOptions: { show: { resource: ['cfdi'] } },
					options: [
						{ name: 'Generar CFDI 4.0', value: 'generarCFDI40', description: 'Timbrar un nuevo CFDI 4.0' },
						{ name: 'Cancelar CFDI v4', value: 'cancelarCFDIsV4', description: 'Cancelar uno o más CFDIs (método v4)' },
						{ name: 'Obtener PDF 4.0', value: 'obtenerPDF40', description: 'Obtener PDF en base64 por UUID' },
						{ name: 'Obtener XML por UUID 4.0', value: 'obtenerXMLPorUUID40', description: 'Obtener XML por UUID' },
						{ name: 'Obtener PDF y XML 4.0', value: 'obtenerPDFyXML40', description: 'Obtener PDF y XML en una sola llamada' },
						{ name: 'Enviar CFDI 4.0', value: 'enviarCFDI40', description: 'Enviar CFDI por correo' },
						{ name: 'Obtener Comprobantes 4.0', value: 'obtenerComprobantes40', description: 'Listar CFDIs por rango de fechas' },
						{ name: 'Consultar Estatus Cancelación', value: 'consultarEstatusCancelacion', description: 'Consultar estatus de cancelación' },
						{ name: 'Obtener Relacionados 4.0', value: 'obtenerRelacionados40', description: 'Obtener CFDIs relacionados' },
						{ name: 'Generar CFDI 3.3 (legacy)', value: 'generarCFDI', description: 'Timbrar CFDI 3.3' },
						{ name: 'Cancelar CFDI 3.3 (legacy)', value: 'cancelarCFDIs', description: 'Cancelar CFDI (método 3.3)' },
						{ name: 'Obtener PDF 3.3 (legacy)', value: 'obtenerPDF', description: 'Obtener PDF CFDI 3.3' },
						{ name: 'Obtener XML por UUID 3.3 (legacy)', value: 'obtenerXMLPorUUID', description: 'Obtener XML CFDI 3.3' },
						{ name: 'Enviar CFDI 3.3 (legacy)', value: 'enviarCFDI', description: 'Enviar CFDI 3.3 por correo' },
						{ name: 'Obtener Comprobantes 3.3 (legacy)', value: 'obtenerComprobantes', description: 'Listar CFDIs 3.3 por rango de fechas' },
					],
					default: 'generarCFDI40',
				},

				// ════════════════════════════════════════════════════════
				// Ticket — operations
				// ════════════════════════════════════════════════════════
				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					noDataExpression: true,
					displayOptions: { show: { resource: ['ticket'] } },
					options: [
						{ name: 'Generar Ticket', value: 'generarTicket', description: 'Crear un ticket' },
						{ name: 'Cancelar Ticket', value: 'cancelarTicket', description: 'Cancelar un ticket' },
						{ name: 'Obtener Tickets', value: 'obtenerTickets', description: 'Listar tickets por rango de fechas' },
					],
					default: 'generarTicket',
				},

				// ════════════════════════════════════════════════════════
				// Crédito — operations
				// ════════════════════════════════════════════════════════
				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					noDataExpression: true,
					displayOptions: { show: { resource: ['credit'] } },
					options: [
						{ name: 'Obtener Números de Crédito', value: 'obtenerNumerosCreditos', description: 'Consultar saldo de créditos' },
						{ name: 'Activar Paquete', value: 'activarPaquete', description: 'Activar un paquete de créditos' },
						{ name: 'Traspasar Paquete', value: 'traspasarPaquete', description: 'Transferir créditos a otra cuenta' },
					],
					default: 'obtenerNumerosCreditos',
				},

				// ════════════════════════════════════════════════════════
				// Utilidad — operations
				// ════════════════════════════════════════════════════════
				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					noDataExpression: true,
					displayOptions: { show: { resource: ['utility'] } },
					options: [
						{ name: 'Validar RFC', value: 'validarRFC', description: 'Validar un RFC mexicano' },
					],
					default: 'validarRFC',
				},

				// ════════════════════════════════════════════════════════
				// Fields: CFDI
				// ════════════════════════════════════════════════════════

				// Comprobante 4.0
				{
					displayName: 'Comprobante JSON',
					name: 'comprobante40',
					type: 'json',
					displayOptions: { show: { resource: ['cfdi'], operation: ['generarCFDI40'] } },
					default: '{}',
					description: 'Objeto Comprobante40R completo como JSON. Ver README para la estructura.',
				},

				// Comprobante 3.3
				{
					displayName: 'Comprobante JSON',
					name: 'comprobante33',
					type: 'json',
					displayOptions: { show: { resource: ['cfdi'], operation: ['generarCFDI'] } },
					default: '{}',
					description: 'Objeto Comprobante33R completo como JSON.',
				},

				// UUID (single — used by multiple operations)
				{
					displayName: 'UUID',
					name: 'uuid',
					type: 'string',
					displayOptions: {
						show: {
							resource: ['cfdi'],
							operation: [
								'obtenerPDF40',
								'obtenerXMLPorUUID40',
								'obtenerPDFyXML40',
								'consultarEstatusCancelacion',
								'obtenerRelacionados40',
								'obtenerPDF',
								'obtenerXMLPorUUID',
							],
						},
					},
					default: '',
					required: true,
					description: 'UUID del CFDI (folio fiscal)',
				},

				// Cancelar v4
				{
					displayName: 'UUIDs a Cancelar (JSON Array)',
					name: 'uuidsCancelar',
					type: 'json',
					displayOptions: { show: { resource: ['cfdi'], operation: ['cancelarCFDIsV4', 'cancelarCFDIs'] } },
					default: '[]',
					description:
						'Array de objetos con uuid, motivo y uuidSustitucion (opcional). Ejemplo: [{"uuid":"...","motivo":"02"}]',
				},
				{
					displayName: 'RFC Emisor',
					name: 'rfcEmisor',
					type: 'string',
					displayOptions: { show: { resource: ['cfdi'], operation: ['cancelarCFDIsV4'] } },
					default: '',
					required: true,
					description: 'RFC del emisor del CFDI',
				},

				// Enviar
				{
					displayName: 'UUID',
					name: 'enviarUuid',
					type: 'string',
					displayOptions: { show: { resource: ['cfdi'], operation: ['enviarCFDI40', 'enviarCFDI'] } },
					default: '',
					required: true,
					description: 'UUID del CFDI a enviar',
				},
				{
					displayName: 'Correo Electrónico',
					name: 'email',
					type: 'string',
					displayOptions: { show: { resource: ['cfdi'], operation: ['enviarCFDI40', 'enviarCFDI'] } },
					default: '',
					required: true,
					description: 'Dirección de correo del destinatario',
				},

				// Obtener Comprobantes
				{
					displayName: 'Fecha Inicio',
					name: 'fechaInicio',
					type: 'string',
					displayOptions: {
						show: { resource: ['cfdi'], operation: ['obtenerComprobantes40', 'obtenerComprobantes'] },
					},
					default: '',
					required: true,
					placeholder: 'YYYY-MM-DDTHH:mm:ss',
					description: 'Fecha de inicio (ISO 8601)',
				},
				{
					displayName: 'Fecha Fin',
					name: 'fechaFin',
					type: 'string',
					displayOptions: {
						show: { resource: ['cfdi'], operation: ['obtenerComprobantes40', 'obtenerComprobantes'] },
					},
					default: '',
					required: true,
					placeholder: 'YYYY-MM-DDTHH:mm:ss',
					description: 'Fecha de fin (ISO 8601)',
				},
				{
					displayName: 'RFC Receptor (opcional)',
					name: 'rfcReceptorBusqueda',
					type: 'string',
					displayOptions: {
						show: { resource: ['cfdi'], operation: ['obtenerComprobantes40', 'obtenerComprobantes'] },
					},
					default: '',
					description: 'Filtrar por RFC del receptor',
				},

				// ════════════════════════════════════════════════════════
				// Fields: Ticket
				// ════════════════════════════════════════════════════════
				{
					displayName: 'Ticket JSON',
					name: 'ticketData',
					type: 'json',
					displayOptions: { show: { resource: ['ticket'], operation: ['generarTicket'] } },
					default: '{}',
					description: 'Datos del ticket como objeto JSON',
				},
				{
					displayName: 'Ticket ID',
					name: 'ticketId',
					type: 'string',
					displayOptions: { show: { resource: ['ticket'], operation: ['cancelarTicket'] } },
					default: '',
					required: true,
					description: 'ID del ticket a cancelar',
				},
				{
					displayName: 'Fecha Inicio',
					name: 'ticketFechaInicio',
					type: 'string',
					displayOptions: { show: { resource: ['ticket'], operation: ['obtenerTickets'] } },
					default: '',
					placeholder: 'YYYY-MM-DDTHH:mm:ss',
					description: 'Fecha de inicio para búsqueda de tickets',
				},
				{
					displayName: 'Fecha Fin',
					name: 'ticketFechaFin',
					type: 'string',
					displayOptions: { show: { resource: ['ticket'], operation: ['obtenerTickets'] } },
					default: '',
					placeholder: 'YYYY-MM-DDTHH:mm:ss',
					description: 'Fecha de fin para búsqueda de tickets',
				},

				// ════════════════════════════════════════════════════════
				// Fields: Crédito
				// ════════════════════════════════════════════════════════
				{
					displayName: 'Número de Crédito',
					name: 'numeroCredito',
					type: 'string',
					displayOptions: { show: { resource: ['credit'], operation: ['activarPaquete'] } },
					default: '',
					required: true,
					description: 'Número / código de activación del paquete',
				},
				{
					displayName: 'Cuenta Destino',
					name: 'cuentaDestino',
					type: 'string',
					displayOptions: { show: { resource: ['credit'], operation: ['traspasarPaquete'] } },
					default: '',
					required: true,
					description: 'Cuenta destino para el traspaso de créditos',
				},
				{
					displayName: 'Cantidad',
					name: 'cantidadCreditos',
					type: 'number',
					displayOptions: { show: { resource: ['credit'], operation: ['traspasarPaquete'] } },
					default: 0,
					required: true,
					description: 'Número de créditos a traspasar',
				},

				// ════════════════════════════════════════════════════════
				// Fields: Utilidad
				// ════════════════════════════════════════════════════════
				{
					displayName: 'RFC',
					name: 'rfc',
					type: 'string',
					displayOptions: { show: { resource: ['utility'], operation: ['validarRFC'] } },
					default: '',
					required: true,
					description: 'RFC a validar',
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
							description: 'Whether to include the raw SOAP response XML in the output (útil para depuración)',
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
					const raw = this.getNodeParameter('comprobante40', i, '{}');
					const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
					soapAction = ACTION_BASE + 'GenerarCFDI40';
					body = envelope(`<tns:GenerarCFDI40>
  ${creds}
  ${objToXml('comprobante', obj)}
</tns:GenerarCFDI40>`);
					responseParser = (xml) => parseRespuestaOperacion(getTag(xml, 'GenerarCFDI40Result') || xml);
				}

				else if (operation === 'generarCFDI') {
					const raw = this.getNodeParameter('comprobante33', i, '{}');
					const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
					soapAction = ACTION_BASE + 'GenerarCFDI';
					body = envelope(`<tns:GenerarCFDI>
  ${creds}
  ${objToXml('comprobante', obj)}
</tns:GenerarCFDI>`);
					responseParser = (xml) => parseRespuestaOperacion(getTag(xml, 'GenerarCFDIResult') || xml);
				}

				else if (operation === 'cancelarCFDIsV4') {
					const raw = this.getNodeParameter('uuidsCancelar', i, '[]');
					const uuids = typeof raw === 'string' ? JSON.parse(raw) : raw;
					const rfcEmisor = this.getNodeParameter('rfcEmisor', i);
					const cancelXml = uuids
						.map(
							(u) => `<tns:CancelacionCR>
    <tns:UUID>${escXml(u.uuid)}</tns:UUID>
    <tns:Motivo>${escXml(u.motivo || '02')}</tns:Motivo>
    ${u.uuidSustitucion ? `<tns:UUIDSustitucion>${escXml(u.uuidSustitucion)}</tns:UUIDSustitucion>` : ''}
  </tns:CancelacionCR>`,
						)
						.join('');
					soapAction = ACTION_BASE + 'CancelarCFDIsV4';
					body = envelope(`<tns:CancelarCFDIsV4>
  ${creds}
  <tns:rfcEmisor>${escXml(rfcEmisor)}</tns:rfcEmisor>
  <tns:cancelaciones>${cancelXml}</tns:cancelaciones>
</tns:CancelarCFDIsV4>`);
					responseParser = (xml) => parseRespuestaCancelacion(getTag(xml, 'CancelarCFDIsV4Result') || xml);
				}

				else if (operation === 'cancelarCFDIs') {
					const raw = this.getNodeParameter('uuidsCancelar', i, '[]');
					const uuids = typeof raw === 'string' ? JSON.parse(raw) : raw;
					const uuidsXml = uuids
						.map((u) => `<tns:string>${escXml(typeof u === 'string' ? u : u.uuid)}</tns:string>`)
						.join('');
					soapAction = ACTION_BASE + 'CancelarCFDIs';
					body = envelope(`<tns:CancelarCFDIs>
  ${creds}
  <tns:uuids>${uuidsXml}</tns:uuids>
</tns:CancelarCFDIs>`);
					responseParser = (xml) => parseRespuestaCancelacion(getTag(xml, 'CancelarCFDIsResult') || xml);
				}

				else if (operation === 'obtenerPDF40') {
					const uuid = this.getNodeParameter('uuid', i);
					soapAction = ACTION_BASE + 'ObtenerPDF40';
					body = envelope(`<tns:ObtenerPDF40>
  ${creds}
  <tns:uuid>${escXml(uuid)}</tns:uuid>
</tns:ObtenerPDF40>`);
					responseParser = (xml) => parseRespuestaOperacion(getTag(xml, 'ObtenerPDF40Result') || xml);
				}

				else if (operation === 'obtenerPDF') {
					const uuid = this.getNodeParameter('uuid', i);
					soapAction = ACTION_BASE + 'ObtenerPDF';
					body = envelope(`<tns:ObtenerPDF>
  ${creds}
  <tns:uuid>${escXml(uuid)}</tns:uuid>
</tns:ObtenerPDF>`);
					responseParser = (xml) => parseRespuestaOperacion(getTag(xml, 'ObtenerPDFResult') || xml);
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

				else if (operation === 'obtenerXMLPorUUID') {
					const uuid = this.getNodeParameter('uuid', i);
					soapAction = ACTION_BASE + 'ObtenerXMLPorUUID';
					body = envelope(`<tns:ObtenerXMLPorUUID>
  ${creds}
  <tns:uuid>${escXml(uuid)}</tns:uuid>
</tns:ObtenerXMLPorUUID>`);
					responseParser = (xml) => parseRespuestaOperacion(getTag(xml, 'ObtenerXMLPorUUIDResult') || xml);
				}

				else if (operation === 'obtenerPDFyXML40') {
					const uuid = this.getNodeParameter('uuid', i);
					soapAction = ACTION_BASE + 'ObtenerPDFyXML40';
					body = envelope(`<tns:ObtenerPDFyXML40>
  ${creds}
  <tns:uuid>${escXml(uuid)}</tns:uuid>
</tns:ObtenerPDFyXML40>`);
					responseParser = (xml) => parseRespuestaOperacion(getTag(xml, 'ObtenerPDFyXML40Result') || xml);
				}

				else if (operation === 'enviarCFDI40') {
					const uuid = this.getNodeParameter('enviarUuid', i);
					const email = this.getNodeParameter('email', i);
					soapAction = ACTION_BASE + 'EnviarCFDI40';
					body = envelope(`<tns:EnviarCFDI40>
  ${creds}
  <tns:uuid>${escXml(uuid)}</tns:uuid>
  <tns:email>${escXml(email)}</tns:email>
</tns:EnviarCFDI40>`);
					responseParser = (xml) => ({ result: getTag(xml, 'EnviarCFDI40Result'), ok: true });
				}

				else if (operation === 'enviarCFDI') {
					const uuid = this.getNodeParameter('enviarUuid', i);
					const email = this.getNodeParameter('email', i);
					soapAction = ACTION_BASE + 'EnviarCFDI';
					body = envelope(`<tns:EnviarCFDI>
  ${creds}
  <tns:uuid>${escXml(uuid)}</tns:uuid>
  <tns:email>${escXml(email)}</tns:email>
</tns:EnviarCFDI>`);
					responseParser = (xml) => ({ result: getTag(xml, 'EnviarCFDIResult'), ok: true });
				}

				else if (operation === 'obtenerComprobantes40') {
					const fechaInicio = this.getNodeParameter('fechaInicio', i);
					const fechaFin = this.getNodeParameter('fechaFin', i);
					const rfcReceptor = this.getNodeParameter('rfcReceptorBusqueda', i, '');
					soapAction = ACTION_BASE + 'ObtenerComprobantes40';
					body = envelope(`<tns:ObtenerComprobantes40>
  ${creds}
  <tns:fechaInicio>${escXml(fechaInicio)}</tns:fechaInicio>
  <tns:fechaFin>${escXml(fechaFin)}</tns:fechaFin>
  ${rfcReceptor ? `<tns:rfcReceptor>${escXml(rfcReceptor)}</tns:rfcReceptor>` : ''}
</tns:ObtenerComprobantes40>`);
					responseParser = (xml) => parseRespuestaReporte(getTag(xml, 'ObtenerComprobantes40Result') || xml);
				}

				else if (operation === 'obtenerComprobantes') {
					const fechaInicio = this.getNodeParameter('fechaInicio', i);
					const fechaFin = this.getNodeParameter('fechaFin', i);
					const rfcReceptor = this.getNodeParameter('rfcReceptorBusqueda', i, '');
					soapAction = ACTION_BASE + 'ObtenerComprobantes';
					body = envelope(`<tns:ObtenerComprobantes>
  ${creds}
  <tns:fechaInicio>${escXml(fechaInicio)}</tns:fechaInicio>
  <tns:fechaFin>${escXml(fechaFin)}</tns:fechaFin>
  ${rfcReceptor ? `<tns:rfcReceptor>${escXml(rfcReceptor)}</tns:rfcReceptor>` : ''}
</tns:ObtenerComprobantes>`);
					responseParser = (xml) => parseRespuestaReporte(getTag(xml, 'ObtenerComprobantesResult') || xml);
				}

				else if (operation === 'consultarEstatusCancelacion') {
					const uuid = this.getNodeParameter('uuid', i);
					soapAction = ACTION_BASE + 'ConsultarEstatusCancelacion';
					body = envelope(`<tns:ConsultarEstatusCancelacion>
  ${creds}
  <tns:uuid>${escXml(uuid)}</tns:uuid>
</tns:ConsultarEstatusCancelacion>`);
					responseParser = (xml) => ({
						estatus: getTag(xml, 'ConsultarEstatusCancelacionResult'),
						ok: true,
					});
				}

				else if (operation === 'obtenerRelacionados40') {
					const uuid = this.getNodeParameter('uuid', i);
					soapAction = ACTION_BASE + 'ObtenerRelacionados40';
					body = envelope(`<tns:ObtenerRelacionados40>
  ${creds}
  <tns:uuid>${escXml(uuid)}</tns:uuid>
</tns:ObtenerRelacionados40>`);
					responseParser = (xml) => parseRespuestaOperacion(getTag(xml, 'ObtenerRelacionados40Result') || xml);
				}
			}

			// ── Ticket ───────────────────────────────────────────────
			else if (resource === 'ticket') {

				if (operation === 'generarTicket') {
					const raw = this.getNodeParameter('ticketData', i, '{}');
					const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
					soapAction = ACTION_BASE + 'GenerarTicket';
					body = envelope(`<tns:GenerarTicket>
  ${creds}
  ${objToXml('ticket', obj)}
</tns:GenerarTicket>`);
					responseParser = (xml) => parseRespuestaOperacion(getTag(xml, 'GenerarTicketResult') || xml);
				}

				else if (operation === 'cancelarTicket') {
					const ticketId = this.getNodeParameter('ticketId', i);
					soapAction = ACTION_BASE + 'CancelarTicket';
					body = envelope(`<tns:CancelarTicket>
  ${creds}
  <tns:ticketId>${escXml(ticketId)}</tns:ticketId>
</tns:CancelarTicket>`);
					responseParser = (xml) => ({ result: getTag(xml, 'CancelarTicketResult'), ok: true });
				}

				else if (operation === 'obtenerTickets') {
					const fechaInicio = this.getNodeParameter('ticketFechaInicio', i, '');
					const fechaFin = this.getNodeParameter('ticketFechaFin', i, '');
					soapAction = ACTION_BASE + 'ObtenerTickets';
					body = envelope(`<tns:ObtenerTickets>
  ${creds}
  ${fechaInicio ? `<tns:fechaInicio>${escXml(fechaInicio)}</tns:fechaInicio>` : ''}
  ${fechaFin ? `<tns:fechaFin>${escXml(fechaFin)}</tns:fechaFin>` : ''}
</tns:ObtenerTickets>`);
					responseParser = (xml) => parseRespuestaReporte(getTag(xml, 'ObtenerTicketsResult') || xml);
				}
			}

			// ── Crédito ──────────────────────────────────────────────
			else if (resource === 'credit') {

				if (operation === 'obtenerNumerosCreditos') {
					soapAction = ACTION_BASE + 'ObtenerNumerosCreditos';
					body = envelope(`<tns:ObtenerNumerosCreditos>
  ${creds}
</tns:ObtenerNumerosCreditos>`);
					responseParser = (xml) => ({
						creditos: getAllTags(xml, 'NumeroCredito').map((c) => ({
							numero: getTag(c, 'Numero'),
							saldo: getTag(c, 'Saldo'),
							tipo: getTag(c, 'Tipo'),
						})),
						raw: getTag(xml, 'ObtenerNumerosCreditosResult'),
						ok: true,
					});
				}

				else if (operation === 'activarPaquete') {
					const numeroCredito = this.getNodeParameter('numeroCredito', i);
					soapAction = ACTION_BASE + 'ActivarPaquete';
					body = envelope(`<tns:ActivarPaquete>
  ${creds}
  <tns:numeroCredito>${escXml(numeroCredito)}</tns:numeroCredito>
</tns:ActivarPaquete>`);
					responseParser = (xml) => ({ result: getTag(xml, 'ActivarPaqueteResult'), ok: true });
				}

				else if (operation === 'traspasarPaquete') {
					const cuentaDestino = this.getNodeParameter('cuentaDestino', i);
					const cantidad = this.getNodeParameter('cantidadCreditos', i);
					soapAction = ACTION_BASE + 'TraspasarPaquete';
					body = envelope(`<tns:TraspasarPaquete>
  ${creds}
  <tns:cuentaDestino>${escXml(cuentaDestino)}</tns:cuentaDestino>
  <tns:cantidad>${escXml(cantidad)}</tns:cantidad>
</tns:TraspasarPaquete>`);
					responseParser = (xml) => ({ result: getTag(xml, 'TraspasarPaqueteResult'), ok: true });
				}
			}

			// ── Utilidad ─────────────────────────────────────────────
			else if (resource === 'utility') {

				if (operation === 'validarRFC') {
					const rfc = this.getNodeParameter('rfc', i);
					soapAction = ACTION_BASE + 'ValidarRFC';
					body = envelope(`<tns:ValidarRFC>
  ${creds}
  <tns:rfc>${escXml(rfc)}</tns:rfc>
</tns:ValidarRFC>`);
					responseParser = (xml) => ({
						valid: getTag(xml, 'ValidarRFCResult') === 'true',
						ok: true,
					});
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
				const faultString =
					getTag(rawXmlResponse, 'faultstring') ||
					getTag(rawXmlResponse, 'Reason') ||
					'SOAP Fault';
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
