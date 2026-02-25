import {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class FacturarEnLineaApi implements ICredentialType {
  name = 'facturarEnLineaApi';
  displayName = 'Facturar En Línea API';
  documentationUrl = 'https://www.facturarenlinea.com.mx';

  properties: INodeProperties[] = [
    {
      displayName: 'Usuario de Timbrado',
      name: 'usuario',
      type: 'string',
      default: '',
      required: true,
      description: 'Usuario FEL® de timbrado (12-13 caracteres)',
    },
    {
      displayName: 'Contraseña',
      name: 'password',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
      description: 'Contraseña de autenticación del usuario (mínimo 6 caracteres)',
    },
    {
      displayName: 'Entorno',
      name: 'environment',
      type: 'options',
      options: [
        {
          name: 'Producción',
          value: 'production',
          description: 'URL productiva — genera CFDIs reales con validez fiscal',
        },
        {
          name: 'Pruebas (Demo)',
          value: 'sandbox',
          description: 'URL de pruebas — genera CFDIs demo sin validez ante el SAT',
        },
      ],
      default: 'sandbox',
      required: true,
    },
  ];
}
