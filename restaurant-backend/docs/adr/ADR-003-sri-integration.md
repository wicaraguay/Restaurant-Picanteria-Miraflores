# ADR-003: SRI Ecuador Electronic Invoicing Integration

## Status

Accepted

## Context

In Ecuador, all businesses must comply with **SRI (Servicio de Rentas Internas)** electronic invoicing regulations. This is a **legal requirement** — failure to implement electronic invoicing can result in fines and business closure.

**SRI Requirements**:
- Generate XML in SRI-specific format (based on OASIS UBL but with Ecuador-specific fields)
- Digitally sign XML using XAdES-BES standard with a valid certificate (.p12)
- Submit signed XML to SRI web services (SOAP-based)
- Receive and store SRI authorization code (37-digit alphanumeric)
- Print authorization code and QR code on PDF invoices
- Handle rejections and resubmissions

**Challenges**:
- Complex XML structure with 100+ required fields
- Certificate management (.p12 files, passwords, expiration)
- SOAP web services (outdated technology, inconsistent responses)
- SRI test environment (different endpoint, test RUCs)
- Network failures and timeouts during submission
- Validation errors returned as cryptic XML messages

Alternatives considered:
1. **Third-party SaaS** (e.g., ClaveFactura, FacturaDirecta): Monthly fees, vendor lock-in, less customization
2. **Build from scratch**: Full control, but high complexity and maintenance burden
3. **Use npm library + custom integration**: Balance of control and convenience

## Decision

Integrate directly with **SRI web services** using:
- **ec-sri-invoice-signer**: npm library for XML generation and signing
- **Custom SOAP client**: Axios-based client with retry logic and circuit breaker
- **Queue-based processing**: Asynchronous submission to avoid blocking HTTP requests

**Architecture**:
```
Client Request → BillingService (creates draft bill)
               ↓
          XMLGenerator (generates signed XML)
               ↓
          InvoiceQueue (enqueues job)
               ↓
          QueueWorker → SRIClient (submits to SRI)
               ↓
          Response Handler → Updates bill status + stores auth code
```

**Implementation Details**:
- XML generation in `src/infrastructure/services/sri/XMLGenerator.ts`
- Digital signature in `src/infrastructure/services/sri/SRISigner.ts`
- SOAP client in `src/infrastructure/services/sri/SRIClient.ts`
- Queue in `src/infrastructure/queue/` (BullMQ for production, in-memory for dev)

## Consequences

### Positive

- **Legal Compliance**: Meets SRI regulations for electronic invoicing
- **Control**: Full control over XML generation and business logic
- **Cost**: No monthly SaaS fees (only certificate renewal)
- **Customization**: Can add restaurant-specific fields or integrations
- **Offline Mode**: Can generate draft bills even if SRI is down (queue handles retry)
- **Audit Trail**: Full history of submissions, rejections, and retries

### Negative

- **Complexity**: SRI integration is one of the most complex parts of the system
- **Maintenance**: Must keep up with SRI regulation changes (e.g., new fields, validation rules)
- **Certificate Management**: Must renew certificates yearly, securely store .p12 files
- **Testing**: SRI test environment requires different RUCs and endpoints
- **Error Handling**: Cryptic error messages from SRI require manual mapping
- **Network Dependency**: Invoices can't be finalized if SRI is unreachable (mitigated by queue)

### Mitigations

- **Retry Logic**: Exponential backoff for transient failures (network, timeouts)
- **Circuit Breaker**: Prevent cascading failures if SRI is down
- **Queue System**: Decouples bill creation from SRI submission
- **Error Mapping**: Custom error parser translates SRI XML errors to user-friendly messages
- **Monitoring**: Alerts for failed jobs, certificate expiration, SRI downtime
- **Dual Environment**: Support for test and production SRI environments via env variables
- **Documentation**: Detailed docs on certificate setup, XML structure, and troubleshooting

## Technical Details

**Required Environment Variables**:
```bash
SRI_ENV=1                          # 1=Test, 2=Production
SRI_SIGNATURE_PATH=./certs/firma.p12
SRI_SIGNATURE_PASSWORD=secret
RUC=1234567890001
ESTAB=001                          # Establishment code
PTO_EMI=001                        # Emission point code
```

**XML Signing (XAdES-BES)**:
- Uses `ec-sri-invoice-signer` library
- Requires valid .p12 certificate issued by SRI-authorized entity
- Signature includes timestamp, certificate chain, and digest

**SOAP Endpoints**:
- Test: `https://celula.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl`
- Production: `https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl`

## References

- [SRI Official Documentation](https://www.sri.gob.ec/facturacion-electronica)
- [ec-sri-invoice-signer npm library](https://www.npmjs.com/package/ec-sri-invoice-signer)
- `src/infrastructure/services/sri/` - SRI integration code
- `docs/diagrams/SRI-INVOICE-FLOW.md` - SRI submission flow diagram
