/**
 * Utility for generating BRCode (PIX Copy/Paste) payloads.
 */

export function generatePixPayload(key: string, name: string, amount: number) {
    // Normalization: Max 25 chars, uppercase, no special chars
    const cleanName = name
        .substring(0, 25)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase();
    
    const city = "SAO PAULO";
    const amountStr = amount.toFixed(2);
    
    const merchantAccountInfo = "0014br.gov.bcb.pix" + `01${key.length.toString().padStart(2, '0')}${key}`;
    
    // Static PIX payload structure
    let payload = 
        "000201" + 
        `26${merchantAccountInfo.length.toString().padStart(2, '0')}${merchantAccountInfo}` + 
        "520400005303986" + 
        `54${amountStr.length.toString().padStart(2, '0')}${amountStr}` + 
        "5802BR" + 
        `59${cleanName.length.toString().padStart(2, '0')}${cleanName}` + 
        `60${city.length.toString().padStart(2, '0')}${city}` + 
        "62070503***6304";

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
