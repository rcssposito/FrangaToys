/**
 * Utility for generating BRCode (PIX Copy/Paste) payloads.
 */

export function generatePixPayload(key: string, name: string, amount: number, txid?: string) {
    // Normalization: Max 25 chars, uppercase, no special chars
    const cleanName = name
        .substring(0, 25)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase();
    
    const city = "SAO PAULO";
    const amountStr = amount.toFixed(2);
    
    const merchantAccountInfo = "0014br.gov.bcb.pix" + `01${key.length.toString().padStart(2, '0')}${key}`;
    
    // Alphanumeric txid (max 25 chars) for static PIX (Central Bank requirement)
    const cleanTxid = txid
        ? txid.replace(/[^A-Za-z0-9]/g, "").substring(0, 25)
        : "***";
        
    const referenceField = `05${cleanTxid.length.toString().padStart(2, '0')}${cleanTxid}`;
    const additionalData = `62${referenceField.length.toString().padStart(2, '0')}${referenceField}`;
    
    // Static PIX payload structure
    let payload = 
        "000201" + 
        `26${merchantAccountInfo.length.toString().padStart(2, '0')}${merchantAccountInfo}` + 
        "520400005303986" + 
        `54${amountStr.length.toString().padStart(2, '0')}${amountStr}` + 
        "5802BR" + 
        `59${cleanName.length.toString().padStart(2, '0')}${cleanName}` + 
        `60${city.length.toString().padStart(2, '0')}${city}` + 
        additionalData +
        "6304";

    // CRC16 Calculation
    let crc = 0xFFFF;
    for (let i = 0; i < payload.length; i++) {
        crc ^= payload.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            if ((crc & 0x8000) !== 0) {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc = crc << 1;
            }
        }
    }
    
    return payload + (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}
