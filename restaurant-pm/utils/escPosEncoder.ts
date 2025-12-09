/**
 * @file escPosEncoder.ts
 * @description Encoder para impresoras térmicas ESC/POS
 * 
 * @purpose
 * Genera comandos ESC/POS para impresoras térmicas.
 * Soporta alineación, negrita, corte de papel, etc.
 * 
 * @connections
 * - Usado por: BillingManagement para impresión Bluetooth
 * 
 * @layer Utils - Hardware Integration
 */

/**
 * ESC/POS Encoder para impresoras térmicas
 */
export class EscPosEncoder {
    private buffer: number[] = [];

    /**
     * Inicializa la impresora
     */
    initialize(): this {
        this.buffer.push(0x1B, 0x40); // ESC @
        return this;
    }

    /**
     * Establece alineación del texto
     */
    align(align: 'left' | 'center' | 'right'): this {
        this.buffer.push(0x1B, 0x61); // ESC a
        if (align === 'center') this.buffer.push(1);
        else if (align === 'right') this.buffer.push(2);
        else this.buffer.push(0);
        return this;
    }

    /**
     * Agrega texto
     */
    text(content: string): this {
        // Simple ASCII encoding
        for (let i = 0; i < content.length; i++) {
            let code = content.charCodeAt(i);
            this.buffer.push(code > 255 ? 63 : code);
        }
        return this;
    }

    /**
     * Agrega salto de línea
     */
    newline(): this {
        this.buffer.push(0x0A); // LF
        return this;
    }

    /**
     * Activa/desactiva negrita
     */
    bold(enable: boolean): this {
        this.buffer.push(0x1B, 0x45, enable ? 1 : 0); // ESC E n
        return this;
    }

    /**
     * Corta el papel
     */
    cut(): this {
        this.buffer.push(0x1D, 0x56, 66, 0); // GS V B n
        return this;
    }

    /**
     * Codifica el buffer a Uint8Array
     */
    encode(): Uint8Array {
        return new Uint8Array(this.buffer);
    }
}
