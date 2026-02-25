import {
  IDataObject,
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeConnectionType,
  NodeOperationError,
} from 'n8n-workflow';

import { soapRequest } from './SoapHelper';

export class FacturarEnLinea implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Facturar En Línea (FEL)',
    name: 'facturarEnLinea',
    // eslint-disable-next-line n8n-nodes-base/node-class-description-icon-url-type-svg
    icon: 'file:facturarenlinea.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
    description: 'Interactúa con el Web Service de Timbrado CFDI de Facturar En Línea (FEL®)',
    defaults: {
      name: 'Facturar En Línea',
    },
    inputs: [NodeConnectionType.Main],
    outputs: [NodeConnectionType.Main],
    credentials: [
      {
        name: 'facturarEnLineaApi',
        required: true,
      },
    ],
    properties: [
      // ─── RESOURCE ───────────────────────────────────────────────────────────
      {
        displayName: 'Recurso',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          { name: 'CFDI', value: 'cfdi' },
          { name: 'Cancelación', value: 'cancelacion' },
          { name: 'Consultas', value: 'consultas' },
          { name: 'Cuenta', value: 'cuenta' },
        ],
        default: 'cfdi',
      },

      // ─── CFDI OPERATIONS ────────────────────────────────────────────────────
      {
        displayName: 'Operación',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['cfdi'] } },
        options: [
          {
            name: 'Timbrar CFDI',
            value: 'timbrar',
            description: 'Envía un XML y obtiene el CFDI timbrado con Timbre Fiscal Digital',
            action: 'Timbrar un CFDI',
          },
          {
            name: 'Obtener PDF',
            value: 'obtenerPdf',
            description: 'Genera la representación impresa en PDF del CFDI (Base64)',
            action: 'Obtener PDF de CFDI',
          },
          {
            name: 'Obtener Acuse de Envío',
            value: 'obtenerAcuseEnvio',
            description: 'Obtiene el acuse que el SAT emite al almacenar el CFDI',
            action: 'Obtener acuse de envío',
          },
          {
            name: 'Consultar Complemento Timbre',
            value: 'consultarComplementoTimbre',
            description: 'Consulta la información del Timbre Fiscal Digital (TFD) de un CFDI',
            action: 'Consultar complemento timbre',
          },
          {
            name: 'Consultar Timbre por Referencia',
            value: 'consultarTimbrePorReferencia',
            description: 'Consulta TFD y XML completo usando la referencia interna',
            action: 'Consultar timbre por referencia',
          },
        ],
        default: 'timbrar',
      },

      // ─── CANCELACIÓN OPERATIONS ─────────────────────────────────────────────
      {
        displayName: 'Operación',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['cancelacion'] } },
        options: [
          {
            name: 'Cancelar CFDI',
            value: 'cancelar',
            description: 'Cancela uno o más CFDIs ante el SAT (consume 1 timbre por UUID con código 201)',
            action: 'Cancelar CFDI',
          },
          {
            name: 'Obtener Acuse de Cancelación',
            value: 'obtenerAcuseCancelacion',
            description: 'Recupera el acuse de cancelación emitido por el SAT',
            action: 'Obtener acuse de cancelación',
          },
        ],
        default: 'cancelar',
      },

      // ─── CONSULTAS OPERATIONS ───────────────────────────────────────────────
      {
        displayName: 'Operación',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['consultas'] } },
        options: [
          {
            name: 'Consultar Créditos',
            value: 'consultarCreditos',
            description: 'Lista todos los paquetes de timbres del usuario con su vigencia y saldo',
            action: 'Consultar créditos disponibles',
          },
          {
            name: 'Consultar Comprobantes',
            value: 'consultarComprobantes',
            description: 'Lista los CFDIs emitidos en un rango de fechas (máx 7 días, 50 por página)',
            action: 'Consultar comprobantes emitidos',
          },
        ],
        default: 'consultarCreditos',
      },

      // ─── CUENTA OPERATIONS ──────────────────────────────────────────────────
      {
        displayName: 'Operación',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['cuenta'] } },
        options: [
          {
            name: 'Cambiar Contraseña',
            value: 'cambiarPassword',
            description: 'Cambia la contraseña del usuario de timbrado FEL®',
            action: 'Cambiar contraseña de usuario',
          },
        ],
        default: 'cambiarPassword',
      },

      // ═══════════════════════════════════════════════════════════════════════
      // CAMPOS POR OPERACIÓN
      // ═══════════════════════════════════════════════════════════════════════

      // ── TimbrarCFDI ────────────────────────────────────────────────────────
      {
        displayName: 'Cadena XML del CFDI',
        name: 'cadenaXml',
        type: 'string',
        typeOptions: { rows: 8 },
        displayOptions: { show: { resource: ['cfdi'], operation: ['timbrar'] } },
        default: '',
        required: true,
        description:
          'Contenido completo del XML v4.0 con todos los requisitos del Anexo 20 del SAT. La fecha debe estar sincronizada con la hora de México (CT).',
      },
      {
        displayName: 'Referencia',
        name: 'referencia',
        type: 'string',
        displayOptions: { show: { resource: ['cfdi'], operation: ['timbrar'] } },
        default: '',
        required: true,
        description:
          'Identificador único (mínimo 4 caracteres) que asignas al CFDI para búsquedas posteriores. Debe ser único por comprobante.',
      },

      // ── Obtener PDF ────────────────────────────────────────────────────────
      {
        displayName: 'UUID (Folio Fiscal)',
        name: 'uuid',
        type: 'string',
        displayOptions: {
          show: {
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
        displayOptions: { show: { resource: ['cfdi'], operation: ['obtenerPdf'] } },
        default: '',
        description: 'Imagen del logotipo codificada en Base64 para incluirla en el PDF. Dejar vacío para omitir.',
      },

      // ── Consultar Timbre por Referencia ────────────────────────────────────
      {
        displayName: 'Referencia',
        name: 'referenciaBusqueda',
        type: 'string',
        displayOptions: {
          show: { resource: ['cfdi'], operation: ['consultarTimbrePorReferencia'] },
        },
        default: '',
        required: true,
        description: 'Referencia interna con la que fue timbrado el CFDI (mínimo 4 caracteres)',
      },

      // ── CancelarCFDI ───────────────────────────────────────────────────────
      {
        displayName: 'RFC Emisor',
        name: 'rfcEmisor',
        type: 'string',
        displayOptions: {
          show: { resource: ['cancelacion'], operation: ['cancelar'] },
        },
        default: '',
        required: true,
        description: 'RFC del emisor de los CFDIs a cancelar',
      },
      {
        displayName: 'Lista de CFDIs a Cancelar',
        name: 'listaCfdi',
        type: 'fixedCollection',
        typeOptions: { multipleValues: true },
        displayOptions: { show: { resource: ['cancelacion'], operation: ['cancelar'] } },
        default: {},
        required: true,
        description: 'Hasta 200 UUID por petición',
        options: [
          {
            name: 'cfdiItem',
            displayName: 'CFDI',
            values: [
              {
                displayName: 'UUID',
                name: 'uuid',
                type: 'string',
                default: '',
                required: true,
                description: 'Folio Fiscal (UUID) del CFDI a cancelar',
              },
              {
                displayName: 'RFC Receptor',
                name: 'rfcReceptor',
                type: 'string',
                default: '',
                required: true,
              },
              {
                displayName: 'Total',
                name: 'total',
                type: 'string',
                default: '',
                required: true,
                description: 'Importe total del CFDI',
              },
              {
                displayName: 'Motivo de Cancelación',
                name: 'motivo',
                type: 'options',
                options: [
                  {
                    name: '01 — Comprobante emitido con errores con relación',
                    value: '01',
                  },
                  {
                    name: '02 — Comprobante emitido con errores sin relación',
                    value: '02',
                  },
                  {
                    name: '03 — No se llevó a cabo la operación',
                    value: '03',
                  },
                  {
                    name: '04 — Operación nominativa relacionada en una factura global',
                    value: '04',
                  },
                ],
                default: '02',
                required: true,
              },
              {
                displayName: 'Folio de Sustitución (UUID)',
                name: 'folioSustitucion',
                type: 'string',
                default: '',
                description: 'Solo requerido cuando el Motivo es "01". UUID del CFDI que sustituye al cancelado.',
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
        displayOptions: { show: { resource: ['cancelacion'], operation: ['cancelar'] } },
        default: '',
        required: true,
        description: 'Archivo PFX (CSD) del emisor codificado en Base64',
      },
      {
        displayName: 'Contraseña del PFX',
        name: 'passwordClavePrivada',
        type: 'string',
        typeOptions: { password: true },
        displayOptions: { show: { resource: ['cancelacion'], operation: ['cancelar'] } },
        default: '',
        required: true,
      },

      // ── Obtener Acuse Cancelación ──────────────────────────────────────────
      {
        displayName: 'UUID (Folio Fiscal)',
        name: 'uuid',
        type: 'string',
        displayOptions: {
          show: { resource: ['cancelacion'], operation: ['obtenerAcuseCancelacion'] },
        },
        default: '',
        required: true,
      },

      // ── Consultar Comprobantes ─────────────────────────────────────────────
      {
        displayName: 'Fecha Inicial',
        name: 'fechaInicial',
        type: 'dateTime',
        displayOptions: { show: { resource: ['consultas'], operation: ['consultarComprobantes'] } },
        default: '',
        required: true,
        description: 'Inicio del rango de búsqueda (máximo 7 días naturales entre inicio y fin)',
      },
      {
        displayName: 'Fecha Final',
        name: 'fechaFinal',
        type: 'dateTime',
        displayOptions: { show: { resource: ['consultas'], operation: ['consultarComprobantes'] } },
        default: '',
        required: true,
      },
      {
        displayName: 'Fila Inicial',
        name: 'filaInicial',
        type: 'number',
        typeOptions: { minValue: 1 },
        displayOptions: { show: { resource: ['consultas'], operation: ['consultarComprobantes'] } },
        default: 1,
        description: 'Número de registro desde donde inicia la página (incrementar de 50 en 50)',
      },

      // ── Cambiar Password ───────────────────────────────────────────────────
      {
        displayName: 'Contraseña Actual',
        name: 'passwordActual',
        type: 'string',
        typeOptions: { password: true },
        displayOptions: { show: { resource: ['cuenta'], operation: ['cambiarPassword'] } },
        default: '',
        required: true,
      },
      {
        displayName: 'Contraseña Nueva',
        name: 'passwordNuevo',
        type: 'string',
        typeOptions: { password: true },
        displayOptions: { show: { resource: ['cuenta'], operation: ['cambiarPassword'] } },
        default: '',
        required: true,
        description: 'Mínimo 6 caracteres. Guarda esta contraseña en un lugar seguro — FEL no tiene acceso a ella.',
      },
    ],
  };

  // ──────────────────────────────────────────────────────────────────────────
  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    const credentials = await this.getCredentials('facturarEnLineaApi');
    const usuario = credentials.usuario as string;
    const password = credentials.password as string;
    const environment = credentials.environment as string;

    for (let i = 0; i < items.length; i++) {
      try {
        const resource = this.getNodeParameter('resource', i) as string;
        const operation = this.getNodeParameter('operation', i) as string;

        let result: Record<string, unknown> = {};

        // ── CFDI ────────────────────────────────────────────────────────────
        if (resource === 'cfdi') {
          if (operation === 'timbrar') {
            const cadenaXml = this.getNodeParameter('cadenaXml', i) as string;
            const referencia = this.getNodeParameter('referencia', i) as string;
            result = await soapRequest(environment, 'TimbrarCFDI', {
              usuario,
              password,
              cadenaXml,
              referencia,
            });
          } else if (operation === 'obtenerPdf') {
            const uuid = this.getNodeParameter('uuid', i) as string;
            const logoBase64 = this.getNodeParameter('logoBase64', i, '') as string;
            result = await soapRequest(environment, 'ObtenerPDF', {
              usuario,
              password,
              UUID: uuid,
              LogoBase64: logoBase64,
            });
          } else if (operation === 'obtenerAcuseEnvio') {
            const uuid = this.getNodeParameter('uuid', i) as string;
            result = await soapRequest(environment, 'ObtenerAcuseEnvio', {
              usuario,
              password,
              UUID: uuid,
            });
          } else if (operation === 'consultarComplementoTimbre') {
            const uuid = this.getNodeParameter('uuid', i) as string;
            result = await soapRequest(environment, 'ConsultarComplementoTimbre', {
              usuario,
              password,
              UUID: uuid,
            });
          } else if (operation === 'consultarTimbrePorReferencia') {
            const referencia = this.getNodeParameter('referenciaBusqueda', i) as string;
            result = await soapRequest(environment, 'ConsultarTimbrePorReferencia', {
              usuario,
              password,
              referencia,
            });
          }
        }

        // ── CANCELACIÓN ─────────────────────────────────────────────────────
        else if (resource === 'cancelacion') {
          if (operation === 'cancelar') {
            const rfcEmisor = this.getNodeParameter('rfcEmisor', i) as string;
            const clavePrivadaBase64 = this.getNodeParameter('clavePrivadaBase64', i) as string;
            const passwordClavePrivada = this.getNodeParameter('passwordClavePrivada', i) as string;
            const listaCfdiRaw = this.getNodeParameter('listaCfdi', i) as {
              cfdiItem?: Array<{
                uuid: string;
                rfcReceptor: string;
                total: string;
                motivo: string;
                folioSustitucion?: string;
              }>;
            };

            const items = listaCfdiRaw.cfdiItem ?? [];
            if (items.length === 0) {
              throw new NodeOperationError(
                this.getNode(),
                'Debes incluir al menos un CFDI en la lista de cancelación.',
                { itemIndex: i },
              );
            }

            // Build the XML list for the SOAP call
            const listaCfdiXml = items
              .map(
                (item) => `<DetalleCFDICancelacion>
  <UUID>${item.uuid}</UUID>
  <RFCReceptor>${item.rfcReceptor}</RFCReceptor>
  <Total>${item.total}</Total>
  <Motivo>${item.motivo}</Motivo>
  ${item.folioSustitucion ? `<FolioSustitucion>${item.folioSustitucion}</FolioSustitucion>` : ''}
</DetalleCFDICancelacion>`,
              )
              .join('\n');

            result = await soapRequest(environment, 'CancelarCFDI', {
              usuario,
              password,
              rFCEmisor: rfcEmisor,
              listaCFDI: listaCfdiXml,
              clavePrivada_Base64: clavePrivadaBase64,
              passwordClavePrivada,
            });
          } else if (operation === 'obtenerAcuseCancelacion') {
            const uuid = this.getNodeParameter('uuid', i) as string;
            result = await soapRequest(environment, 'ObtenerAcuseCancelacion', {
              usuario,
              password,
              UUID: uuid,
            });
          }
        }

        // ── CONSULTAS ────────────────────────────────────────────────────────
        else if (resource === 'consultas') {
          if (operation === 'consultarCreditos') {
            result = await soapRequest(environment, 'ConsultarCreditos', {
              usuario,
              password,
            });
          } else if (operation === 'consultarComprobantes') {
            const fechaInicial = this.getNodeParameter('fechaInicial', i) as string;
            const fechaFinal = this.getNodeParameter('fechaFinal', i) as string;
            const filaInicial = this.getNodeParameter('filaInicial', i) as number;
            result = await soapRequest(environment, 'ConsultarComprobantes', {
              usuario,
              password,
              fechaInicial: formatFelDate(fechaInicial),
              fechaFinal: formatFelDate(fechaFinal),
              filaInicial: String(filaInicial),
            });
          }
        }

        // ── CUENTA ───────────────────────────────────────────────────────────
        else if (resource === 'cuenta') {
          if (operation === 'cambiarPassword') {
            const passwordActual = this.getNodeParameter('passwordActual', i) as string;
            const passwordNuevo = this.getNodeParameter('passwordNuevo', i) as string;
            result = await soapRequest(environment, 'CambiarPassword', {
              usuario,
              passwordActual,
              passwordNuevo,
            });
          }
        }

        // Check for FEL-level errors
        if (result.OperacionExitosa === 'false' || result.OperacionExitosa === false) {
          const errorMsg = result.MensajeError || result.MensajeErrorDetallado || 'Error desconocido en FEL';
          throw new NodeOperationError(
            this.getNode(),
            `FEL Error: ${errorMsg}`,
            { itemIndex: i, description: String(result.MensajeErrorDetallado ?? '') },
          );
        }

        returnData.push({
          json: result as IDataObject,
          pairedItem: { item: i },
        });
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: {
              error: (error as Error).message,
            },
            pairedItem: { item: i },
          });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}

/**
 * Converts a date string to FEL's required format: yyyy-mm-ddThh:mm:ss
 */
function formatFelDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toISOString().replace('Z', '').split('.')[0];
  } catch {
    return dateStr;
  }
}
