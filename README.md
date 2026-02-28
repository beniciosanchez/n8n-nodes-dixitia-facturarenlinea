# n8n-nodes-dixitia-facturarenlinea

Nodo comunitario de n8n para el servicio **FEL ConexionRemota** de Dixitia — facturación electrónica CFDI en México.

## Instalación

### n8n self-hosted

```bash
npm install n8n-nodes-dixitia-facturarenlinea
```

O desde la UI: **Settings → Community Nodes → Install** → `n8n-nodes-dixitia-facturarenlinea`

### Desarrollo local

```bash
cd ~/.n8n/custom
git clone https://github.com/beniciosanchez/n8n-nodes-dixitia-facturarenlinea
cd n8n-nodes-dixitia-facturarenlinea
npm install
```

---

## Credenciales

Crear una credencial de tipo **Dixitia-FEL API** con:

| Campo    | Descripción         |
|----------|---------------------|
| Cuenta   | ID de cuenta FEL    |
| Usuario  | Usuario FEL         |
| Password | Contraseña FEL      |

---

## Endpoints

| Ambiente    | URL |
|-------------|-----|
| Producción  | `https://fel.mx/CR33/ConexionRemota.svc` |
| Test        | `http://app.fel.mx/CR33Test/ConexionRemota.svc` |

---

## Operaciones

### Resource: CFDI

| Operación | Método SOAP | Descripción |
|-----------|-------------|-------------|
| Generar CFDI 4.0 | `GenerarCFDI40` | Timbrar CFDI 4.0 |
| Cancelar CFDI v4 | `CancelarCFDIsV4` | Cancelar con motivo y RFC |
| Obtener PDF 4.0 | `ObtenerPDF40` | PDF en base64 por UUID |
| Obtener XML por UUID 4.0 | `ObtenerXMLPorUUID40` | XML por UUID |
| Obtener PDF y XML 4.0 | `ObtenerPDFyXML40` | PDF y XML en una llamada |
| Enviar CFDI 4.0 | `EnviarCFDI40` | Enviar por correo |
| Obtener Comprobantes 4.0 | `ObtenerComprobantes40` | Listar por rango de fechas |
| Consultar Estatus Cancelación | `ConsultarEstatusCancelacion` | Estatus de cancelación |
| Obtener Relacionados 4.0 | `ObtenerRelacionados40` | CFDIs relacionados |
| Generar CFDI 3.3 (legacy) | `GenerarCFDI` | Timbrar CFDI 3.3 |
| Cancelar CFDI 3.3 (legacy) | `CancelarCFDIs` | Cancelar (método 3.3) |
| Obtener PDF 3.3 (legacy) | `ObtenerPDF` | PDF CFDI 3.3 |
| Obtener XML por UUID 3.3 (legacy) | `ObtenerXMLPorUUID` | XML CFDI 3.3 |
| Enviar CFDI 3.3 (legacy) | `EnviarCFDI` | Enviar CFDI 3.3 |
| Obtener Comprobantes 3.3 (legacy) | `ObtenerComprobantes` | Listar CFDI 3.3 |

### Resource: Ticket

| Operación | Método SOAP | Descripción |
|-----------|-------------|-------------|
| Generar Ticket | `GenerarTicket` | Crear ticket |
| Cancelar Ticket | `CancelarTicket` | Cancelar ticket |
| Obtener Tickets | `ObtenerTickets` | Listar por rango de fechas |

### Resource: Crédito

| Operación | Método SOAP | Descripción |
|-----------|-------------|-------------|
| Obtener Números de Crédito | `ObtenerNumerosCreditos` | Consultar saldo |
| Activar Paquete | `ActivarPaquete` | Activar paquete de créditos |
| Traspasar Paquete | `TraspasarPaquete` | Transferir créditos |

### Resource: Utilidad

| Operación | Método SOAP | Descripción |
|-----------|-------------|-------------|
| Validar RFC | `ValidarRFC` | Validar RFC mexicano |

---

## Ejemplo: Generar CFDI 4.0

En el campo **Comprobante JSON**, pasar el objeto `Comprobante40R` completo:

```json
{
  "Version": "4.0",
  "Serie": "A",
  "Folio": "1",
  "Fecha": "2024-01-15T10:00:00",
  "FormaPago": "01",
  "SubTotal": "1000.00",
  "Moneda": "MXN",
  "Total": "1160.00",
  "TipoDeComprobante": "I",
  "Exportacion": "01",
  "MetodoPago": "PUE",
  "LugarExpedicion": "64000",
  "Emisor": {
    "Rfc": "ABC010101AAA",
    "Nombre": "Empresa Emisora SA de CV",
    "RegimenFiscal": "601"
  },
  "Receptor": {
    "Rfc": "XAXX010101000",
    "Nombre": "Publico en General",
    "DomicilioFiscalReceptor": "06600",
    "RegimenFiscalReceptor": "616",
    "UsoCFDI": "S01"
  },
  "Conceptos": [
    {
      "ClaveProdServ": "01010101",
      "Cantidad": "1",
      "ClaveUnidad": "ACT",
      "Descripcion": "Servicio",
      "ValorUnitario": "1000.00",
      "Importe": "1000.00",
      "ObjetoImp": "02",
      "Impuestos": {
        "Traslados": [
          {
            "Base": "1000.00",
            "Impuesto": "002",
            "TipoFactor": "Tasa",
            "TasaOCuota": "0.160000",
            "Importe": "160.00"
          }
        ]
      }
    }
  ],
  "Impuestos": {
    "TotalImpuestosTrasladados": "160.00",
    "Traslados": [
      {
        "Base": "1000.00",
        "Impuesto": "002",
        "TipoFactor": "Tasa",
        "TasaOCuota": "0.160000",
        "Importe": "160.00"
      }
    ]
  }
}
```

## Ejemplo: Cancelar CFDI v4

```json
[
  {
    "uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "motivo": "02"
  }
]
```

Motivos SAT: `01` (sustituido — requiere `uuidSustitucion`), `02` (errores en la factura), `03` (operación no realizada), `04` (operación nominativa relacionada en una factura global).

---

## Campos de salida (operaciones CFDI)

| Campo | Descripción |
|-------|-------------|
| `xml` | XML del CFDI en base64 |
| `pdf` | PDF en base64 |
| `uuid` | UUID / folio fiscal |
| `folio` | Folio de la factura |
| `serie` | Serie de la factura |
| `fechaTimbrado` | Fecha y hora del timbrado |
| `codigoError` | Código de error (vacío = éxito) |
| `descripcionError` | Descripción del error |
| `ok` | `true` si la operación fue exitosa |
