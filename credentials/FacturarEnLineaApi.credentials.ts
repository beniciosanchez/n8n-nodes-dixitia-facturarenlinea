import {
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class FacturarEnLineaApi implements ICredentialType {
  name = 'facturarEnLineaApi';
  displayName = 'Facturar En Línea API';
  documentationUrl = 'https://www.facturarenlinea.com.mx';

  properties: INodeProperties[] = [
    // ── Entorno ──────────────────────────────────────────────────────────────
    {
      displayName: 'Entorno',
      name: 'environment',
      type: 'options',
      options: [
        {
          name: 'Pruebas (Demo)',
          value: 'sandbox',
          description: 'URL de pruebas — genera CFDIs demo sin validez ante el SAT',
        },
        {
          name: 'Producción',
          value: 'production',
          description: 'URL productiva — genera CFDIs reales con validez fiscal',
        },
      ],
      default: 'sandbox',
      required: true,
    },

    // ── Credenciales Timbrado (WSCFDI33) ─────────────────────────────────────
    {
      displayName: 'Usuario de Timbrado',
      name: 'usuario',
      type: 'string',
      default: '',
      description:
        'Usuario FEL® exclusivo para el servicio de timbrado (12-13 caracteres). ' +
        'Distinto al usuario del portal FEL en línea.',
      hint: 'Requerido para el servicio de Timbrado (WSCFDI33)',
    },
    {
      displayName: 'Contraseña de Timbrado',
      name: 'password',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      description: 'Contraseña del usuario de timbrado (mínimo 6 caracteres)',
      hint: 'Requerido para el servicio de Timbrado (WSCFDI33)',
    },

    // ── Credenciales Conexión Remota (CR33) ───────────────────────────────────
    {
      displayName: 'Cuenta (Conexión Remota)',
      name: 'cuenta',
      type: 'string',
      default: '',
      description:
        'Cuenta FEL® para el servicio de Conexión Remota. ' +
        'Generalmente igual al Usuario pero puede diferir.',
      hint: 'Requerido para el servicio de Conexión Remota (CR33)',
    },
    {
      displayName: 'Usuario de Conexión Remota',
      name: 'usuarioCR',
      type: 'string',
      default: '',
      description: 'Usuario FEL® para el servicio de Conexión Remota (12-13 caracteres)',
      hint: 'Requerido para el servicio de Conexión Remota (CR33)',
    },
    {
      displayName: 'Contraseña de Conexión Remota',
      name: 'passwordCR',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      description: 'Contraseña del usuario de Conexión Remota (mínimo 6 caracteres)',
      hint: 'Requerido para el servicio de Conexión Remota (CR33)',
    },
  ];
}
