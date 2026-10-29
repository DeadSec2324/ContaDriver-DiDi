# 🚗 E&J Profit - Control Contable para Choferes DiDi

**E&J Profit** es una aplicación web contable de alto rendimiento diseñada específicamente para conductores de **DiDi** (y plataformas de viajes), optimizada para usarse cómodamente desde el soporte del celular en el auto o en la computadora.

---

## ⚡ Inicio Rápido

### En Windows (PC):
1. Haz doble clic en el archivo **`Iniciar_ContaDriver.bat`**.
2. Se abrirá automáticamente la aplicación en tu navegador web en `http://localhost:8000`.

### En tu Celular (Android / iPhone):
1. Asegúrate de que tu celular esté conectado a la misma red Wi-Fi o Hotspot que tu PC.
2. La ventana negra del servidor mostrará la dirección de tu celular (por ejemplo: `http://192.168.1.15:8000`).
3. Abre esa dirección en el navegador de tu celular (Chrome o Safari).
4. **Instalar como App**: Toca los tres puntos de Chrome o el botón de compartir en Safari y selecciona **"Añadir a la pantalla principal"**. ¡Tendrá su propio icono y funcionará a pantalla completa como una app nativa, incluso sin internet!

---

## 💡 ¿Cómo funciona la contabilidad?

### 1. Base Inicial de Efectivo (Fondo para Cambio)
Antes de empezar tu turno, toca el botón verde **Base Inicial** e ingresa cuánto efectivo traes en la cartera (por ejemplo: `$500`).
* Así el sistema **no confunde** el dinero que ya tenías con lo que entra de tus viajes.

### 2. Registro de Viajes DiDi
Al terminar un viaje, presiona **"Registrar Viaje DiDi"**:
* **Tarifa de la App**: Ingresas lo que dice DiDi que debes cobrar (ej: `$80`).
* **Pago Exacto**: Si el cliente te pagó exacto, tocas el botón **"Pago Exacto"** y listo.
* **Cliente dio más (ej: dio $100 en un viaje de $80)**:
  * El sistema detecta automáticamente la diferencia de `$20`.
  * Puedes elegir con un toque:
    * **"Es Propina"**: El cliente te dijo *"quédese con el cambio"*. A tus bolsillos entran los `$100` completos y el sistema anota `$20` de propina extra.
    * **"Devolví Cambio"**: Le diste sus `$20` de cambio. A tus bolsillos entran los `$80` netos y la propina queda en `$0`.
* **Tipo de cobro**:
  * **Efectivo**: Suma directamente al efectivo físico que tienes en el bolsillo.
  * **Tarjeta / App**: Se registra en tus ingresos DiDi pero no suma al efectivo en mano.

### 3. Registro de Gastos
Presiona **"Registrar Gasto"**:
* Selecciona la categoría con iconos rápidos (Gasolina ⛽, Comida 🌮, Lavado 🧼, Taller 🔧, Casetas 🛣️, Datos 📱, etc.).
* Indica si lo pagaste con **Efectivo** (para que lo descuente de tu bolsillo) o con **Tarjeta** (para que no afecte el conteo físico de billetes).

### 4. Cuadre y Arqueo de Bolsillo
Al terminar el día, toca **"Cuadrar"**:
* El sistema te muestra la fórmula exacta:
  $$\text{Deberías tener en el bolsillo} = \text{Base Inicial} + \text{Efectivo de viajes} - \text{Gastos en efectivo}$$
* Cuentas tus billetes físicos y anotas la cantidad: el sistema te dirá si cuadraste exacto, si te sobra o si te falta dinero.

### 5. Reportes y Gráficas
En la pestaña **"Reportes"** puedes consultar:
* Filtros por: **Hoy (Diario)**, **Semanal**, **Quincenal**, **Mensual** o **Todo**.
* **Gráfica de Dona**: Porcentaje de ganancia neta vs porcentaje que se fue en gastos.
* **Gráfica de Pastel**: Desglose de en qué se fue el dinero (Gasolina vs Comida, etc.).
* **Gráfica de Barras**: Evolución de ingresos vs gastos día por día.
* **Botón de Descarga**: Exporta tus datos directamente a **Excel (CSV)**.

---

## 🔒 Privacidad y Respaldo
Todos tus datos se guardan de forma 100% privada y segura en la memoria de tu propio dispositivo. Puedes hacer copias de seguridad en cualquier momento desde el menú de **Ajustes > Descargar Copia de Seguridad (JSON)**.
