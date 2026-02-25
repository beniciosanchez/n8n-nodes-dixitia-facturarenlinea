# n8n-nodes-facturarenlinea

Nodo comunitario de [n8n](https://n8n.io/) que integra con el **Web Service de Timbrado CFDI** de [Facturar En Línea (FEL®)](https://www.facturarenlinea.com.mx).

## Instalación

Sigue la [guía de instalación de community nodes](https://docs.n8n.io/integrations/community-nodes/installation/) de n8n:

1. Abre tu instancia de n8n.
2. Ve a **Configuración › Community Nodes**.
3. Selecciona **Instalar**.
4. Ingresa `n8n-nodes-facturarenlinea` en el campo de nombre de paquete npm.
5. Acepta los riesgos y selecciona **Instalar**.

## Credenciales

Crea una credencial de tipo **Facturar En Línea API** con:

| Campo | Descripción |
|---|---|
| **Usuario de Timbrado** | Usuario FEL® exclusivo para el servicio de timbrado (12-13 caracteres). Es distinto al usuario de acceso al portal. |
| **Contraseña** | Contraseña del usuario de timbrado (mínimo 6 caracteres). |
| **Entorno** | `Pruebas` para desarrollo (CFDIs demo, sin validez fiscal) o `Producción` para CFDIs reales. |

> ⚠️ **Importante:** El usuario de timbrado es **diferente** al usuario del portal FEL en línea. Solicítalo directamente con soporte FEL.

## Operaciones disponibles

### 📄 CFDI
| Operación | Método FEL | Consume timbres |
|---|---|---|
| **Timbrar CFDI** | `TimbrarCFDI` | ✅ Sí (si es exitoso) |
| **Obtener PDF** | `ObtenerPDF` | ❌ No |
| **Obtener Acuse de Envío** | `ObtenerAcuseEnvio` | ❌ No |
| **Consultar Complemento Timbre** | `ConsultarComplementoTimbre` | ❌ No |
| **Consultar Timbre por Referencia** | `ConsultarTimbrePorReferencia` | ❌ No |

### ❌ Cancelación
| Operación | Método FEL | Consume timbres |
|---|---|---|
| **Cancelar CFDI** | `CancelarCFDI` | ✅ 1 timbre por UUID con código 201 |
| **Obtener Acuse de Cancelación** | `ObtenerAcuseCancelacion` | ❌ No |

### 🔍 Consultas
| Operación | Método FEL |
|---|---|
| **Consultar Créditos** | `ConsultarCreditos` |
| **Consultar Comprobantes** | `ConsultarComprobantes` |

### ⚙️ Cuenta
| Operación | Método FEL |
|---|---|
| **Cambiar Contraseña** | `CambiarPassword` |

## Uso

### Timbrar un CFDI

1. Selecciona Recurso: **CFDI** → Operación: **Timbrar CFDI**.
2. Pega el XML v4.0 completo (con sello CSD) en el campo **Cadena XML del CFDI**.
3. Proporciona una **Referencia** única para identificar este comprobante.
4. La respuesta incluye `UUID`, `FechaTimbrado`, `SelloSAT`, `SelloCFD`, `XMLResultado` (CFDI timbrado).

> 💡 La fecha del XML debe estar sincronizada con la hora de México (CT). Consulta [time.is/CT](https://time.is/CT). El CFDI debe timbrase dentro de las 24 horas siguientes a su emisión.

### Cancelar CFDIs

1. Proporciona el **RFC Emisor** y el **PFX en Base64** con su contraseña.
2. Agrega los CFDIs con UUID, RFC receptor, total y motivo de cancelación.
3. Si el motivo es `01`, incluye el **Folio de Sustitución** (UUID del CFDI que lo reemplaza).

> ⚠️ La cancelación no se puede revertir. Se recomienda cancelar después de 24 horas de emitido el CFDI.

### Consultar Comprobantes

- El rango máximo es **7 días naturales**.
- Cada página devuelve hasta **50 registros**.
- Usa el parámetro `Fila Inicial` para paginar (1, 51, 101, etc.).

## Manejo de errores

Cuando `OperacionExitosa` es `false`, el nodo lanza un error con el mensaje de FEL. Puedes activar **Continuar en caso de error** en el nodo para manejar los errores con una rama de error.

### Política de margen de error FEL
- Si más del **10%** de tus peticiones son inválidas, se cobra timbre por cada petición.
- Si superas el **30%** de errores, la cuenta se bloquea.
- **Nunca** envíes ciclos de reintentos automáticos con XMLs inválidos.

## Compatibilidad

Probado con n8n v1.x y la API WSDL de FEL v4.0.

## URLs del servicio

| Entorno | URL |
|---|---|
| Producción | `https://www.fel.mx/WSTimbrado33/WSCFDI33.svc?WSDL` |
| Pruebas | `https://app.fel.mx/WSTimbrado33Test/WSCFDI33.svc?WSDL` |

## Recursos

- [Manual de API Timbrado FEL](https://www.facturarenlinea.com.mx/descargas/FLP_Manual_de_API_Timbrado.pdf)
- [Portal FEL](https://portalfel.blikon.com)
- [Documentación community nodes n8n](https://docs.n8n.io/integrations/community-nodes/)
- [Ejemplo XML CFDI 4.0](https://www.facturarenlinea.com.mx/sdk/XML_Ejemplo_40.xml)

## Licencia

MIT
