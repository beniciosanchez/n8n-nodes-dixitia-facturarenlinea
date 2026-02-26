import {
  IDataObject,
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeConnectionType,
  NodeOperationError,
} from 'n8n-workflow';

import { soapRequest, soapRequestCR } from './SoapHelper';

export class FacturarEnLinea implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Facturar En Línea (FEL)',
    name: 'facturarEnLinea',
    // eslint-disable-next-line n8n-nodes-base/node-class-description-icon-url-type-svg
    icon: 'file:facturarenlinea.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["servicio"] + " · " + $parameter["cfdiVersion"] + " · " + $parameter["operation"]}}',
    description: 'Interactúa con los servicios de Timbrado y Conexión Remota de Facturar En Línea (FEL®)',
    defaults: { name: 'Facturar En Línea' },
    inputs: [NodeConnectionType.Main],
    outputs: [NodeConnectionType.Main],
    credentials: [{ name: 'facturarEnLineaApi', required: true }],

    properties: [

      // ═══════════════════════════════════════════════════════════════════════
      // NIVEL 1: SERVICIO
      // ═══════════════════════════════════════════════════════════════════════
      {
        displayName: 'Servicio',
        name: 'servicio',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Timbrado (WSCFDI33)',
            value: 'timbrado',
            description: 'Tu sistema construye y sella el XML; FEL solo lo timbra',
          },
          {
            name: 'Conexión Remota (CR33)',
            value: 'cr',
            description: 'FEL construye, sella y timbra el CFDI a partir de tus datos',
          },
        ],
        default: 'timbrado',
      },

      // ═══════════════════════════════════════════════════════════════════════
      // NIVEL 2: VERSIÓN CFDI
      // ═══════════════════════════════════════════════════════════════════════
      {
        displayName: 'Versión CFDI',
        name: 'cfdiVersion',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'CFDI 4.0',
            value: 'v40',
            description: 'Versión actual recomendada (ventana de timbrado: 24 horas)',
          },
          {
            name: 'CFDI 3.3',
            value: 'v33',
            description: 'Versión anterior (ventana de timbrado: 72 horas)',
          },
        ],
        default: 'v40',
      },

      // ═══════════════════════════════════════════════════════════════════════
      // NIVEL 3: RECURSO — TIMBRADO
      // ═══════════════════════════════════════════════════════════════════════
      {
        displayName: 'Recurso',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { servicio: ['timbrado'] } },
        options: [
          { name: 'CFDI',        value: 'cfdi' },
          { name: 'Cancelación', value: 'cancelacion' },
          { name: 'Consultas',   value: 'consultas' },
          { name: 'Cuenta',      value: 'cuenta' },
        ],
        default: 'cfdi',
      },

      // ═══════════════════════════════════════════════════════════════════════
      // NIVEL 3: RECURSO — CONEXIÓN REMOTA
      // ═══════════════════════════════════════════════════════════════════════
      {
        displayName: 'Recurso',
        name: 'resourceCR',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { servicio: ['cr'] } },
        options: [
          { name: 'CFDI',        value: 'cfdi' },
          { name: 'Cancelación', value: 'cancelacion' },
          { name: 'Consultas',   value: 'consultas' },
          { name: 'Cuenta',      value: 'cuenta' },
        ],
        default: 'cfdi',
      },

      // ═══════════════════════════════════════════════════════════════════════
      // OPERACIONES — TIMBRADO / CFDI
      // ═══════════════════════════════════════════════════════════════════════
      {
        displayName: 'Operación',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { servicio: ['timbrado'], resource: ['cfdi'] } },
        options: [
          { name: 'Timbrar CFDI',                 value: 'timbrar',                    action: 'Timbrar un CFDI' },
          { name: 'Obtener PDF',                  value: 'obtenerPdf',                 action: 'Obtener PDF de un CFDI' },
          { name: 'Obtener Acuse de Envío',        value: 'obtenerAcuseEnvio',          action: 'Obtener acuse de envío' },
          { name: 'Consultar Complemento Timbre', value: 'consultarComplementoTimbre', action: 'Consultar complemento timbre' },
          { name: 'Consultar Timbre por Referencia', value: 'consultarTimbrePorReferencia', action: 'Consultar timbre por referencia' },
        ],
        default: 'timbrar',
      },

      // ─── TIMBRADO / CANCELACIÓN ──────────────────────────────────────────
      {
        displayName: 'Operación',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { servicio: ['timbrado'], resource: ['cancelacion'] } },
        options: [
          { name: 'Cancelar CFDI',                  value: 'cancelar',                   action: 'Cancelar CFDI' },
          { name: 'Cancelación Asíncrona',           value: 'cancelacionAsincrona',        action: 'Cancelación asíncrona (solo v3.3)' },
          { name: 'Estatus Cancelación Asíncrona',   value: 'estatusCancelacionAsincrona', action: 'Estatus cancelación asíncrona (solo v3.3)' },
          { name: 'Obtener Acuse de Cancelación',    value: 'obtenerAcuseCancelacion',     action: 'Obtener acuse de cancelación' },
        ],
        default: 'cancelar',
      },

      // ─── TIMBRADO / CONSULTAS ────────────────────────────────────────────
      {
        displayName: 'Operación',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { servicio: ['timbrado'], resource: ['consultas'] } },
        options: [
          { name: 'Consultar Créditos',      value: 'consultarCreditos',      action: 'Consultar créditos disponibles' },
          { name: 'Consultar Comprobantes',  value: 'consultarComprobantes',  action: 'Consultar comprobantes emitidos' },
        ],
        default: 'consultarCreditos',
      },

      // ─── TIMBRADO / CUENTA ───────────────────────────────────────────────
      {
        displayName: 'Operación',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { servicio: ['timbrado'], resource: ['cuenta'] } },
        options: [
          { name: 'Cambiar Contraseña', value: 'cambiarPassword', action: 'Cambiar contraseña de usuario' },
        ],
        default: 'cambiarPassword',
      },

      // ═══════════════════════════════════════════════════════════════════════
      // OPERACIONES — CONEXIÓN REMOTA / CFDI
      // ═══════════════════════════════════════════════════════════════════════
      {
        displayName: 'Operación',
        name: 'operationCR',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { servicio: ['cr'], resourceCR: ['cfdi'] } },
        options: [
          { name: 'Generar CFDI',              value: 'generarCfdi',           action: 'Generar y timbrar CFDI (FEL construye el XML)' },
          { name: 'Obtener XML por UUID',       value: 'obtenerXmlPorUuid',     action: 'Obtener XML por UUID' },
          { name: 'Obtener XML por Referencia', value: 'obtenerXmlPorRef',      action: 'Obtener XML por referencia interna' },
          { name: 'Obtener PDF',               value: 'obtenerPdfCR',          action: 'Obtener PDF del CFDI' },
          { name: 'Obtener Acuse de Envío',     value: 'obtenerAcuseEnvioCR',   action: 'Obtener acuse de envío' },
          { name: 'Enviar CFDI por Email',      value: 'enviarCfdi',            action: 'Enviar CFDI por email al receptor' },
        ],
        default: 'generarCfdi',
      },

      // ─── CR / CANCELACIÓN ────────────────────────────────────────────────
      {
        displayName: 'Operación',
        name: 'operationCR',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { servicio: ['cr'], resourceCR: ['cancelacion'] } },
        options: [
          { name: 'Cancelar CFDIs',              value: 'cancelarCfdisCR',           action: 'Cancelar uno o más CFDIs' },
          { name: 'Obtener Acuse de Cancelación', value: 'obtenerAcuseCancelacionCR', action: 'Obtener acuse de cancelación' },
          { name: 'Obtener Comprobantes',         value: 'obtenerComprobantesCR',     action: 'Listar comprobantes por rango de fechas' },
        ],
        default: 'cancelarCfdisCR',
      },

      // ─── CR / CONSULTAS ──────────────────────────────────────────────────
      {
        displayName: 'Operación',
        name: 'operationCR',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { servicio: ['cr'], resourceCR: ['consultas'] } },
        options: [
          { name: 'Obtener Números de Créditos', value: 'obtenerNumerosCreditos', action: 'Consultar créditos disponibles' },
          { name: 'Validar RFC',                 value: 'validarRfc',             action: 'Validar RFC ante el SAT' },
          { name: 'Obtener Tickets',             value: 'obtenerTickets',         action: 'Obtener tickets del sistema' },
        ],
        default: 'obtenerNumerosCreditos',
      },

      // ─── CR / CUENTA ─────────────────────────────────────────────────────
      {
        displayName: 'Operación',
        name: 'operationCR',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { servicio: ['cr'], resourceCR: ['cuenta'] } },
        options: [
          { name: 'Activar Paquete',    value: 'activarPaquete',    action: 'Activar paquete de créditos' },
          { name: 'Traspasar Paquete',  value: 'traspasarPaquete',  action: 'Traspasar paquete de créditos' },
          { name: 'Cancelar Ticket',    value: 'cancelarTicket',    action: 'Cancelar un ticket' },
        ],
        default: 'activarPaquete',
      },

      // ═══════════════════════════════════════════════════════════════════════
      // CAMPOS — TIMBRADO
      // ═══════════════════════════════════════════════════════════════════════

      // ── TimbrarCFDI ────────────────────────────────────────────────────────
      {
        displayName: 'Cadena XML del CFDI',
        name: 'cadenaXml',
        type: 'string',
        typeOptions: { rows: 8 },
        displayOptions: { show: { servicio: ['timbrado'], resource: ['cfdi'], operation: ['timbrar'] } },
        default: '',
        required: true,
        description: 'Contenido completo del XML (v3.3 o v4.0 según versión seleccionada) con sello CSD incluido',
      },
      {
        displayName: 'Referencia',
        name: 'referencia',
        type: 'string',
        displayOptions: { show: { servicio: ['timbrado'], resource: ['cfdi'], operation: ['timbrar'] } },
        default: '',
        required: true,
        description: 'Identificador único (mínimo 4 caracteres) para este comprobante. Debe ser único por CFDI.',
      },

      // ── UUID (compartido para varias operaciones de timbrado) ─────────────
      {
        displayName: 'UUID (Folio Fiscal)',
        name: 'uuid',
        type: 'string',
        displayOptions: {
          show: {
            servicio: ['timbrado'],
            resource: ['cfdi'],
            operation: ['obtenerPdf', 'obtenerAcuseEnvio', 'consultarComplementoTimbre'],
          },
        },
        default: '',
        required: true,
        description: 'UUID / Folio Fiscal del CFDI (32 caracteres sin guiones)',
      },
      {
        displayName: 'Logo en Base64',
        name: 'logoBase64',
        type: 'string',
        typeOptions: { rows: 3 },
        displayOptions: { show: { servicio: ['timbrado'], resource: ['cfdi'], operation: ['obtenerPdf'] } },
        default: '',
        description: 'Imagen del logotipo en Base64 para el PDF. Dejar vacío para omitir.',
      },

      // ── ConsultarTimbrePorReferencia ───────────────────────────────────────
      {
        displayName: 'Referencia',
        name: 'referenciaBusqueda',
        type: 'string',
        displayOptions: { show: { servicio: ['timbrado'], resource: ['cfdi'], operation: ['consultarTimbrePorReferencia'] } },
        default: '',
        required: true,
        description: 'Referencia interna con la que fue timbrado el CFDI (mínimo 4 caracteres)',
      },

      // ── CancelarCFDI ───────────────────────────────────────────────────────
      {
        displayName: 'RFC Emisor',
        name: 'rfcEmisor',
        type: 'string',
        displayOptions: { show: { servicio: ['timbrado'], resource: ['cancelacion'], operation: ['cancelar', 'cancelacionAsincrona'] } },
        default: '',
        required: true,
        description: 'RFC del emisor de los CFDIs a cancelar',
      },
      {
        displayName: 'Lista de CFDIs a Cancelar',
        name: 'listaCfdi',
        type: 'fixedCollection',
        typeOptions: { multipleValues: true },
        displayOptions: { show: { servicio: ['timbrado'], resource: ['cancelacion'], operation: ['cancelar', 'cancelacionAsincrona'] } },
        default: {},
        required: true,
        description: 'Hasta 200 UUID por petición',
        options: [
          {
            name: 'cfdiItem',
            displayName: 'CFDI',
            values: [
              { displayName: 'UUID',          name: 'uuid',          type: 'string',  default: '', required: true },
              { displayName: 'RFC Receptor',  name: 'rfcReceptor',   type: 'string',  default: '', required: true },
              { displayName: 'Total',         name: 'total',         type: 'string',  default: '', required: true, description: 'Importe total del CFDI' },
              {
                displayName: 'Motivo de Cancelación',
                name: 'motivo',
                type: 'options',
                options: [
                  { name: '01 — Con relación (requiere folio sustitución)', value: '01' },
                  { name: '02 — Sin relación',                               value: '02' },
                  { name: '03 — No se llevó a cabo la operación',            value: '03' },
                  { name: '04 — Operación nominativa en factura global',      value: '04' },
                ],
                default: '02',
                required: true,
              },
              {
                displayName: 'Folio de Sustitución (UUID)',
                name: 'folioSustitucion',
                type: 'string',
                default: '',
                description: 'Solo requerido cuando el Motivo es "01"',
              },
            ],
          },
        ],
      },
      {
        displayName: 'Certificado PFX en Base64',
        name: 'clavePrivadaBase64',
        type: 'string',
        typeOptions: { rows: 3, password: true },
        displayOptions: { show: { servicio: ['timbrado'], resource: ['cancelacion'], operation: ['cancelar', 'cancelacionAsincrona'] } },
        default: '',
        required: true,
        description: 'Archivo PFX (CSD) del emisor codificado en Base64',
      },
      {
        displayName: 'Contraseña del PFX',
        name: 'passwordClavePrivada',
        type: 'string',
        typeOptions: { password: true },
        displayOptions: { show: { servicio: ['timbrado'], resource: ['cancelacion'], operation: ['cancelar', 'cancelacionAsincrona'] } },
        default: '',
        required: true,
      },

      // ── EstatusCancelacionAsincrona ────────────────────────────────────────
      {
        displayName: 'Referencia de Cancelación Asíncrona',
        name: 'referenciaAsincrona',
        type: 'string',
        displayOptions: { show: { servicio: ['timbrado'], resource: ['cancelacion'], operation: ['estatusCancelacionAsincrona'] } },
        default: '',
        required: true,
        description: 'Referencia que empieza con CAN_ASINC_ recibida al cancelar',
      },

      // ── ObtenerAcuseCancelacion ────────────────────────────────────────────
      {
        displayName: 'UUID (Folio Fiscal)',
        name: 'uuidCancelacion',
        type: 'string',
        displayOptions: { show: { servicio: ['timbrado'], resource: ['cancelacion'], operation: ['obtenerAcuseCancelacion'] } },
        default: '',
        required: true,
      },

      // ── ConsultarComprobantes ──────────────────────────────────────────────
      {
        displayName: 'Fecha Inicial',
        name: 'fechaInicial',
        type: 'dateTime',
        displayOptions: { show: { servicio: ['timbrado'], resource: ['consultas'], operation: ['consultarComprobantes'] } },
        default: '',
        required: true,
        description: 'Inicio del rango (máximo 7 días naturales entre inicio y fin)',
      },
      {
        displayName: 'Fecha Final',
        name: 'fechaFinal',
        type: 'dateTime',
        displayOptions: { show: { servicio: ['timbrado'], resource: ['consultas'], operation: ['consultarComprobantes'] } },
        default: '',
        required: true,
      },
      {
        displayName: 'Fila Inicial',
        name: 'filaInicial',
        type: 'number',
        typeOptions: { minValue: 1 },
        displayOptions: { show: { servicio: ['timbrado'], resource: ['consultas'], operation: ['consultarComprobantes'] } },
        default: 1,
        description: 'Registro desde donde inicia la página. v3.3: incrementar de 50 en 50. v4.0: incrementar de 20 en 20.',
      },

      // ── CambiarPassword ───────────────────────────────────────────────────
      {
        displayName: 'Contraseña Actual',
        name: 'passwordActual',
        type: 'string',
        typeOptions: { password: true },
        displayOptions: { show: { servicio: ['timbrado'], resource: ['cuenta'], operation: ['cambiarPassword'] } },
        default: '',
        required: true,
      },
      {
        displayName: 'Contraseña Nueva',
        name: 'passwordNuevo',
        type: 'string',
        typeOptions: { password: true },
        displayOptions: { show: { servicio: ['timbrado'], resource: ['cuenta'], operation: ['cambiarPassword'] } },
        default: '',
        required: true,
        description: 'Mínimo 6 caracteres. FEL no tiene acceso a tu contraseña — guárdala en un lugar seguro.',
      },

      // ═══════════════════════════════════════════════════════════════════════
      // CAMPOS — CONEXIÓN REMOTA
      // ═══════════════════════════════════════════════════════════════════════

      // ── GenerarCFDI / GenerarCFDI40 ───────────────────────────────────────
      {
        displayName: 'Datos del CFDI (JSON)',
        name: 'datosCfdiJson',
        type: 'string',
        typeOptions: { rows: 10 },
        displayOptions: { show: { servicio: ['cr'], resourceCR: ['cfdi'], operationCR: ['generarCfdi'] } },
        default: '',
        required: true,
        description:
          'Objeto JSON con todos los datos del comprobante. FEL construirá el XML por ti. ' +
          'Consulta la documentación de ConexionRemota para la estructura requerida.',
      },
      {
        displayName: 'Referencia',
        name: 'referenciaCR',
        type: 'string',
        displayOptions: { show: { servicio: ['cr'], resourceCR: ['cfdi'], operationCR: ['generarCfdi'] } },
        default: '',
        required: true,
        description: 'Referencia única (mínimo 4 caracteres) para identificar este comprobante',
      },

      // ── ObtenerXML por UUID ───────────────────────────────────────────────
      {
        displayName: 'UUID (Folio Fiscal)',
        name: 'uuidCR',
        type: 'string',
        displayOptions: {
          show: {
            servicio: ['cr'],
            resourceCR: ['cfdi'],
            operationCR: ['obtenerXmlPorUuid', 'obtenerPdfCR', 'obtenerAcuseEnvioCR', 'enviarCfdi'],
          },
        },
        default: '',
        required: true,
        description: 'UUID / Folio Fiscal del CFDI (32 caracteres sin guiones)',
      },

      // ── ObtenerXML por Referencia ─────────────────────────────────────────
      {
        displayName: 'Referencia',
        name: 'referenciaXmlCR',
        type: 'string',
        displayOptions: { show: { servicio: ['cr'], resourceCR: ['cfdi'], operationCR: ['obtenerXmlPorRef'] } },
        default: '',
        required: true,
        description: 'Referencia interna con la que fue generado el CFDI',
      },

      // ── ObtenerPDF CR ─────────────────────────────────────────────────────
      {
        displayName: 'Logo en Base64',
        name: 'logoBase64CR',
        type: 'string',
        typeOptions: { rows: 3 },
        displayOptions: { show: { servicio: ['cr'], resourceCR: ['cfdi'], operationCR: ['obtenerPdfCR'] } },
        default: '',
        description: 'Imagen del logotipo en Base64. Dejar vacío para omitir.',
      },

      // ── EnviarCFDI ────────────────────────────────────────────────────────
      {
        displayName: 'Email del Receptor',
        name: 'emailReceptor',
        type: 'string',
        displayOptions: { show: { servicio: ['cr'], resourceCR: ['cfdi'], operationCR: ['enviarCfdi'] } },
        default: '',
        required: true,
        description: 'Dirección de correo electrónico del receptor del CFDI',
      },

      // ── CancelarCFDIs CR ──────────────────────────────────────────────────
      {
        displayName: 'Lista de CFDIs a Cancelar',
        name: 'listaCfdiCR',
        type: 'fixedCollection',
        typeOptions: { multipleValues: true },
        displayOptions: { show: { servicio: ['cr'], resourceCR: ['cancelacion'], operationCR: ['cancelarCfdisCR'] } },
        default: {},
        required: true,
        options: [
          {
            name: 'cfdiItem',
            displayName: 'CFDI',
            values: [
              { displayName: 'UUID',         name: 'uuid',        type: 'string', default: '', required: true },
              { displayName: 'RFC Receptor', name: 'rfcReceptor', type: 'string', default: '', required: true },
              { displayName: 'Total',        name: 'total',       type: 'string', default: '', required: true },
              {
                displayName: 'Motivo',
                name: 'motivo',
                type: 'options',
                options: [
                  { name: '01 — Con relación', value: '01' },
                  { name: '02 — Sin relación', value: '02' },
                  { name: '03 — No se llevó a cabo', value: '03' },
                  { name: '04 — Factura global', value: '04' },
                ],
                default: '02',
                required: true,
              },
              { displayName: 'Folio de Sustitución', name: 'folioSustitucion', type: 'string', default: '' },
            ],
          },
        ],
      },

      // ── ObtenerAcuseCancelacion CR ─────────────────────────────────────────
      {
        displayName: 'UUID (Folio Fiscal)',
        name: 'uuidAcuseCR',
        type: 'string',
        displayOptions: { show: { servicio: ['cr'], resourceCR: ['cancelacion'], operationCR: ['obtenerAcuseCancelacionCR'] } },
        default: '',
        required: true,
      },

      // ── ObtenerComprobantes CR ────────────────────────────────────────────
      {
        displayName: 'Fecha Inicial',
        name: 'fechaInicialCR',
        type: 'dateTime',
        displayOptions: { show: { servicio: ['cr'], resourceCR: ['cancelacion'], operationCR: ['obtenerComprobantesCR'] } },
        default: '',
        required: true,
        description: 'Inicio del rango de búsqueda (máximo 7 días naturales)',
      },
      {
        displayName: 'Fecha Final',
        name: 'fechaFinalCR',
        type: 'dateTime',
        displayOptions: { show: { servicio: ['cr'], resourceCR: ['cancelacion'], operationCR: ['obtenerComprobantesCR'] } },
        default: '',
        required: true,
      },
      {
        displayName: 'Fila Inicial',
        name: 'filaInicialCR',
        type: 'number',
        typeOptions: { minValue: 1 },
        displayOptions: { show: { servicio: ['cr'], resourceCR: ['cancelacion'], operationCR: ['obtenerComprobantesCR'] } },
        default: 1,
        description: 'Registro desde donde inicia la página (incrementar de 20 en 20)',
      },

      // ── ValidarRFC ────────────────────────────────────────────────────────
      {
        displayName: 'RFC a Validar',
        name: 'rfcValidar',
        type: 'string',
        displayOptions: { show: { servicio: ['cr'], resourceCR: ['consultas'], operationCR: ['validarRfc'] } },
        default: '',
        required: true,
      },

      // ── CancelarTicket ────────────────────────────────────────────────────
      {
        displayName: 'ID Ticket',
        name: 'ticketId',
        type: 'string',
        displayOptions: { show: { servicio: ['cr'], resourceCR: ['cuenta'], operationCR: ['cancelarTicket'] } },
        default: '',
        required: true,
      },

      // ── ActivarPaquete / TraspasarPaquete ─────────────────────────────────
      {
        displayName: 'Código de Paquete',
        name: 'codigoPaquete',
        type: 'string',
        displayOptions: { show: { servicio: ['cr'], resourceCR: ['cuenta'], operationCR: ['activarPaquete', 'traspasarPaquete'] } },
        default: '',
        required: true,
        description: 'Código del paquete de créditos a activar o traspasar',
      },
    ],
  };

  // ──────────────────────────────────────────────────────────────────────────
  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    const credentials = await this.getCredentials('facturarEnLineaApi');
    const environment   = credentials.environment as string;

    // Timbrado credentials
    const usuario  = credentials.usuario  as string;
    const password = credentials.password as string;

    // ConexionRemota credentials
    const cuenta     = credentials.cuenta     as string;
    const usuarioCR  = credentials.usuarioCR  as string;
    const passwordCR = credentials.passwordCR as string;

    for (let i = 0; i < items.length; i++) {
      try {
        const servicio     = this.getNodeParameter('servicio',     i) as string;
        const cfdiVersion  = this.getNodeParameter('cfdiVersion',  i) as string;
        const isV40        = cfdiVersion === 'v40';

        let result: Record<string, unknown> = {};

        // ════════════════════════════════════════════════════════════════════
        // TIMBRADO (WSCFDI33)
        // ════════════════════════════════════════════════════════════════════
        if (servicio === 'timbrado') {
          const resource  = this.getNodeParameter('resource',  i) as string;
          const operation = this.getNodeParameter('operation', i) as string;

          // ── CFDI ──────────────────────────────────────────────────────────
          if (resource === 'cfdi') {
            if (operation === 'timbrar') {
              const cadenaXml = this.getNodeParameter('cadenaXml',  i) as string;
              const referencia = this.getNodeParameter('referencia', i) as string;
              result = await soapRequest(environment, 'TimbrarCFDI', { usuario, password, cadenaXml, referencia });

            } else if (operation === 'obtenerPdf') {
              const uuid       = this.getNodeParameter('uuid',       i) as string;
              const logoBase64 = this.getNodeParameter('logoBase64', i, '') as string;
              result = await soapRequest(environment, 'ObtenerPDF', { usuario, password, UUID: uuid, LogoBase64: logoBase64 });

            } else if (operation === 'obtenerAcuseEnvio') {
              const uuid = this.getNodeParameter('uuid', i) as string;
              result = await soapRequest(environment, 'ObtenerAcuseEnvio', { usuario, password, UUID: uuid });

            } else if (operation === 'consultarComplementoTimbre') {
              const uuid = this.getNodeParameter('uuid', i) as string;
              result = await soapRequest(environment, 'ConsultarComplementoTimbre', { usuario, password, UUID: uuid });

            } else if (operation === 'consultarTimbrePorReferencia') {
              const referencia = this.getNodeParameter('referenciaBusqueda', i) as string;
              result = await soapRequest(environment, 'ConsultarTimbrePorReferencia', { usuario, password, referencia });
            }
          }

          // ── CANCELACIÓN ───────────────────────────────────────────────────
          else if (resource === 'cancelacion') {
            if (operation === 'cancelar' || operation === 'cancelacionAsincrona') {
              const method = operation === 'cancelar' ? 'CancelarCFDI' : 'CancelacionAsincrona';
              const rfcEmisor            = this.getNodeParameter('rfcEmisor',            i) as string;
              const clavePrivadaBase64   = this.getNodeParameter('clavePrivadaBase64',   i) as string;
              const passwordClavePrivada = this.getNodeParameter('passwordClavePrivada', i) as string;
              const listaCfdiRaw = this.getNodeParameter('listaCfdi', i) as {
                cfdiItem?: Array<{ uuid: string; rfcReceptor: string; total: string; motivo: string; folioSustitucion?: string }>;
              };
              const cfdiItems = listaCfdiRaw.cfdiItem ?? [];
              if (cfdiItems.length === 0) {
                throw new NodeOperationError(this.getNode(), 'Debes incluir al menos un CFDI.', { itemIndex: i });
              }
              const listaCfdiXml = cfdiItems.map((item) =>
                `<DetalleCFDICancelacion>
  <UUID>${item.uuid}</UUID>
  <RFCReceptor>${item.rfcReceptor}</RFCReceptor>
  <Total>${item.total}</Total>
  <Motivo>${item.motivo}</Motivo>
  ${item.folioSustitucion ? `<FolioSustitucion>${item.folioSustitucion}</FolioSustitucion>` : ''}
</DetalleCFDICancelacion>`).join('\n');
              result = await soapRequest(environment, method, {
                usuario, password,
                rFCEmisor: rfcEmisor,
                listaCFDI: listaCfdiXml,
                clavePrivada_Base64: clavePrivadaBase64,
                passwordClavePrivada,
              });

            } else if (operation === 'estatusCancelacionAsincrona') {
              const referencia = this.getNodeParameter('referenciaAsincrona', i) as string;
              result = await soapRequest(environment, 'EstatusCancelacionAsincrona', { usuario, password, referencia });

            } else if (operation === 'obtenerAcuseCancelacion') {
              const uuid = this.getNodeParameter('uuidCancelacion', i) as string;
              result = await soapRequest(environment, 'ObtenerAcuseCancelacion', { usuario, password, UUID: uuid });
            }
          }

          // ── CONSULTAS ─────────────────────────────────────────────────────
          else if (resource === 'consultas') {
            if (operation === 'consultarCreditos') {
              result = await soapRequest(environment, 'ConsultarCreditos', { usuario, password });

            } else if (operation === 'consultarComprobantes') {
              const fechaInicial = this.getNodeParameter('fechaInicial', i) as string;
              const fechaFinal   = this.getNodeParameter('fechaFinal',   i) as string;
              const filaInicial  = this.getNodeParameter('filaInicial',  i) as number;
              result = await soapRequest(environment, 'ConsultarComprobantes', {
                usuario, password,
                fechaInicial: formatFelDate(fechaInicial),
                fechaFinal:   formatFelDate(fechaFinal),
                filaInicial:  String(filaInicial),
              });
            }
          }

          // ── CUENTA ────────────────────────────────────────────────────────
          else if (resource === 'cuenta') {
            if (operation === 'cambiarPassword') {
              const passwordActual = this.getNodeParameter('passwordActual', i) as string;
              const passwordNuevo  = this.getNodeParameter('passwordNuevo',  i) as string;
              result = await soapRequest(environment, 'CambiarPassword', { usuario, passwordActual, passwordNuevo });
            }
          }
        }

        // ════════════════════════════════════════════════════════════════════
        // CONEXIÓN REMOTA (CR33)
        // ════════════════════════════════════════════════════════════════════
        else if (servicio === 'cr') {
          const resourceCR  = this.getNodeParameter('resourceCR',  i) as string;
          const operationCR = this.getNodeParameter('operationCR', i) as string;
          const crCreds     = { cuenta, usuario: usuarioCR, password: passwordCR };

          // ── CFDI ──────────────────────────────────────────────────────────
          if (resourceCR === 'cfdi') {
            if (operationCR === 'generarCfdi') {
              const method      = isV40 ? 'GenerarCFDI40' : 'GenerarCFDI';
              const datosCfdi   = this.getNodeParameter('datosCfdiJson', i) as string;
              const referencia  = this.getNodeParameter('referenciaCR',  i) as string;
              // Parse JSON and pass as flat params; the XML payload goes as CadenaXML
              let parsedDatos: Record<string, string> = {};
              try {
                parsedDatos = JSON.parse(datosCfdi);
              } catch {
                throw new NodeOperationError(this.getNode(), 'El campo "Datos del CFDI" no es un JSON válido.', { itemIndex: i });
              }
              result = await soapRequestCR(environment, method, crCreds, { ...parsedDatos, referencia });

            } else if (operationCR === 'obtenerXmlPorUuid') {
              const method = isV40 ? 'ObtenerXMLPorUUID40' : 'ObtenerXMLPorUUID';
              const uuid   = this.getNodeParameter('uuidCR', i) as string;
              result = await soapRequestCR(environment, method, crCreds, { UUID: uuid });

            } else if (operationCR === 'obtenerXmlPorRef') {
              const method     = isV40 ? 'ObtenerXMLPorReferencia40' : 'ObtenerXMLPorReferencia';
              const referencia = this.getNodeParameter('referenciaXmlCR', i) as string;
              result = await soapRequestCR(environment, method, crCreds, { referencia });

            } else if (operationCR === 'obtenerPdfCR') {
              const method     = isV40 ? 'ObtenerPDF40' : 'ObtenerPDF';
              const uuid       = this.getNodeParameter('uuidCR',       i) as string;
              const logoBase64 = this.getNodeParameter('logoBase64CR', i, '') as string;
              result = await soapRequestCR(environment, method, crCreds, { UUID: uuid, LogoBase64: logoBase64 });

            } else if (operationCR === 'obtenerAcuseEnvioCR') {
              const uuid = this.getNodeParameter('uuidCR', i) as string;
              result = await soapRequestCR(environment, 'ObtenerAcuseEnvio', crCreds, { UUID: uuid });

            } else if (operationCR === 'enviarCfdi') {
              const method = isV40 ? 'EnviarCFDI40' : 'EnviarCFDI';
              const uuid   = this.getNodeParameter('uuidCR',       i) as string;
              const email  = this.getNodeParameter('emailReceptor', i) as string;
              result = await soapRequestCR(environment, method, crCreds, { UUID: uuid, Email: email });
            }
          }

          // ── CANCELACIÓN ───────────────────────────────────────────────────
          else if (resourceCR === 'cancelacion') {
            if (operationCR === 'cancelarCfdisCR') {
              const method       = isV40 ? 'CancelarCFDIsV4' : 'CancelarCFDIs';
              const listaCfdiRaw = this.getNodeParameter('listaCfdiCR', i) as {
                cfdiItem?: Array<{ uuid: string; rfcReceptor: string; total: string; motivo: string; folioSustitucion?: string }>;
              };
              const cfdiItems = listaCfdiRaw.cfdiItem ?? [];
              if (cfdiItems.length === 0) {
                throw new NodeOperationError(this.getNode(), 'Debes incluir al menos un CFDI.', { itemIndex: i });
              }
              const listaCfdiXml = cfdiItems.map((item) =>
                `<DetalleCFDICancelacion>
  <UUID>${item.uuid}</UUID>
  <RFCReceptor>${item.rfcReceptor}</RFCReceptor>
  <Total>${item.total}</Total>
  <Motivo>${item.motivo}</Motivo>
  ${item.folioSustitucion ? `<FolioSustitucion>${item.folioSustitucion}</FolioSustitucion>` : ''}
</DetalleCFDICancelacion>`).join('\n');
              result = await soapRequestCR(environment, method, crCreds, { listaCFDIs: listaCfdiXml });

            } else if (operationCR === 'obtenerAcuseCancelacionCR') {
              const uuid = this.getNodeParameter('uuidAcuseCR', i) as string;
              result = await soapRequestCR(environment, 'ObtenerAcuseCancelacion', crCreds, { UUID: uuid });

            } else if (operationCR === 'obtenerComprobantesCR') {
              const method       = isV40 ? 'ObtenerComprobantes40' : 'ObtenerComprobantes';
              const fechaInicial = this.getNodeParameter('fechaInicialCR', i) as string;
              const fechaFinal   = this.getNodeParameter('fechaFinalCR',   i) as string;
              const filaInicial  = this.getNodeParameter('filaInicialCR',  i) as number;
              result = await soapRequestCR(environment, method, crCreds, {
                FechaInicial: formatFelDate(fechaInicial),
                FechaFinal:   formatFelDate(fechaFinal),
                FilaInicial:  String(filaInicial),
              });
            }
          }

          // ── CONSULTAS ─────────────────────────────────────────────────────
          else if (resourceCR === 'consultas') {
            if (operationCR === 'obtenerNumerosCreditos') {
              result = await soapRequestCR(environment, 'ObtenerNumerosCreditos', crCreds);

            } else if (operationCR === 'validarRfc') {
              const rfc = this.getNodeParameter('rfcValidar', i) as string;
              result = await soapRequestCR(environment, 'ValidarRFC', crCreds, { RFC: rfc });

            } else if (operationCR === 'obtenerTickets') {
              result = await soapRequestCR(environment, 'ObtenerTickets', crCreds);
            }
          }

          // ── CUENTA ────────────────────────────────────────────────────────
          else if (resourceCR === 'cuenta') {
            if (operationCR === 'activarPaquete') {
              const codigo = this.getNodeParameter('codigoPaquete', i) as string;
              result = await soapRequestCR(environment, 'ActivarPaquete', crCreds, { CodigoPaquete: codigo });

            } else if (operationCR === 'traspasarPaquete') {
              const codigo = this.getNodeParameter('codigoPaquete', i) as string;
              result = await soapRequestCR(environment, 'TraspasarPaquete', crCreds, { CodigoPaquete: codigo });

            } else if (operationCR === 'cancelarTicket') {
              const ticketId = this.getNodeParameter('ticketId', i) as string;
              result = await soapRequestCR(environment, 'CancelarTicket', crCreds, { TicketId: ticketId });
            }
          }
        }

        // ── FEL-level error check ─────────────────────────────────────────
        if (result.OperacionExitosa === 'false' || result.OperacionExitosa === false) {
          const errorMsg = result.MensajeError || result.ErrorGeneral || 'Error desconocido en FEL';
          throw new NodeOperationError(
            this.getNode(),
            `FEL Error: ${errorMsg}`,
            { itemIndex: i, description: String(result.MensajeErrorDetallado ?? result.ErrorDetallado ?? '') },
          );
        }

        returnData.push({ json: result as IDataObject, pairedItem: { item: i } });

      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}

// ─── UTILS ────────────────────────────────────────────────────────────────────

/** Converts a date string to FEL's required format: yyyy-mm-ddThh:mm:ss */
function formatFelDate(dateStr: string): string {
  try {
    return new Date(dateStr).toISOString().replace('Z', '').split('.')[0];
  } catch {
    return dateStr;
  }
}
