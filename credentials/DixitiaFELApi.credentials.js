'use strict';

class DixitiaFELApi {
	constructor() {
		this.name = 'dixitiaFELApi';
		this.displayName = 'Dixitia-FEL API';
		this.documentationUrl = 'https://fel.mx';
		this.properties = [
			{
				displayName: 'Cuenta',
				name: 'cuenta',
				type: 'string',
				default: '',
				required: true,
				description: 'Account identifier',
			},
			{
				displayName: 'Usuario',
				name: 'usuario',
				type: 'string',
				default: '',
				required: true,
				description: 'Username',
			},
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				required: true,
				description: 'Password',
			},
		];
		this.test = {
			request: {
				method: 'POST',
				url: 'https://fel.mx/CR33/ConexionRemota.svc',
				body: '<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="http://tempuri.org/"><soap:Body><tns:ValidarRFC><tns:credenciales><tns:Cuenta>{{$credentials.cuenta}}</tns:Cuenta><tns:Usuario>{{$credentials.usuario}}</tns:Usuario><tns:Password>{{$credentials.password}}</tns:Password></tns:credenciales><tns:rfc>XAXX010101000</tns:rfc></tns:ValidarRFC></soap:Body></soap:Envelope>',
				headers: {
					'Content-Type': 'text/xml; charset=utf-8',
					SOAPAction: '"http://tempuri.org/IConexionRemota/ValidarRFC"',
				},
			},
		};
	}
}

module.exports = { DixitiaFELApi };
