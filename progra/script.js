// =====================================================
// CropTech 360
// Sistema agrícola inteligente
// =====================================================


// =====================================================
// 1. VARIABLES GLOBALES
// =====================================================

let latSeleccionada = 10;
let lonSeleccionada = -84;

let mapa = null;

let marcadorA = null;
let marcadorB = null;

let datosClima = null;
let graficoRotacion = null;

let ubicacionA = null;
let ubicacionB = null;

let parcelaActiva = "A";

let capaZonasRecomendadas = null;


// =====================================================
// 2. INICIALIZACIÓN
// =====================================================

document.addEventListener("DOMContentLoaded", () => {

    iniciarMapa();

    document.getElementById("consultar-clima")
        ?.addEventListener("click", consultarClima);

    document.getElementById("seleccionar-a")
        ?.addEventListener("click", () => seleccionarParcela("A"));

    document.getElementById("seleccionar-b")
        ?.addEventListener("click", () => seleccionarParcela("B"));

    document.getElementById("comparar-parcelas")
        ?.addEventListener("click", compararParcelas);

    document.getElementById("analizar-cultivo")
        ?.addEventListener("click", () => {

            const cultivo = document.getElementById("cultivo-mapa").value;

            mostrarZonasRecomendadas(cultivo);

        });

    document.getElementById("cultivo-mapa")
        ?.addEventListener("change", function () {

            const boton = document.getElementById("analizar-cultivo");
            const informacion = document.getElementById("zona-recomendada-info");

            if (boton) {
                boton.disabled = this.value === "";
            }

            if (informacion) {
                informacion.textContent =
                    this.value === ""
                        ? "Selecciona un cultivo."
                        : "Presiona el botón para visualizar las zonas.";
            }

        });

    // Evento del simulador de rotación
    document.getElementById("simular")
        ?.addEventListener("click", generarSimulacion);

    crearPanelEnfermedades();

    iniciarAnimacion();

});


// =====================================================
// 3. ANIMACIÓN DE ENTRADA
// =====================================================

function iniciarAnimacion() {

    document.body.classList.add("animacion-entrada");

    setTimeout(() => {

        document.body.classList.remove("animacion-entrada");

    }, 1800);

}


// =====================================================
// 4. INICIAR MAPA
// =====================================================

function iniciarMapa() {

    const elementoMapa = document.getElementById("mapa-interactivo");

    if (!elementoMapa || typeof L === "undefined") {

        console.error("No se encontró Leaflet o el contenedor del mapa.");

        return;

    }

    mapa = L.map("mapa-interactivo").setView(
        [latSeleccionada, lonSeleccionada],
        8
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {

        maxZoom: 18,

        attribution: "&copy; OpenStreetMap"

    }).addTo(mapa);

    mapa.on("click", function (evento) {

        latSeleccionada = evento.latlng.lat;

        lonSeleccionada = evento.latlng.lng;

        actualizarCoordenadas(latSeleccionada, lonSeleccionada);

        registrarUbicacion(latSeleccionada, lonSeleccionada);

    });

    actualizarCoordenadas(latSeleccionada, lonSeleccionada);

    setTimeout(() => mapa.invalidateSize(), 300);

}


// =====================================================
// 5. ACTUALIZAR COORDENADAS
// =====================================================

function actualizarCoordenadas(lat, lon) {

    const latitud = document.getElementById("latitud");

    const longitud = document.getElementById("longitud");

    if (latitud) latitud.textContent = lat.toFixed(4);

    if (longitud) longitud.textContent = lon.toFixed(4);

}


// =====================================================
// 6. SELECCIONAR PARCELA
// =====================================================

function seleccionarParcela(letra) {

    parcelaActiva = letra;

    document.getElementById("seleccionar-a")
        ?.classList.toggle("parcela-activa", letra === "A");

    document.getElementById("seleccionar-b")
        ?.classList.toggle("parcela-activa", letra === "B");

    alert("Selecciona en el mapa la ubicación de la parcela " + letra + ".");

}


// =====================================================
// 7. REGISTRAR UBICACIONES
// =====================================================

function registrarUbicacion(lat, lon) {

    const ubicacion = {
        lat: lat,
        lon: lon
    };

    if (parcelaActiva === "A") {

        ubicacionA = ubicacion;

        const coordenadasA = document.getElementById("coordenadas-a");

        if (coordenadasA) {

            coordenadasA.textContent =
                `${lat.toFixed(4)}, ${lon.toFixed(4)}`;

        }

        if (marcadorA) {

            marcadorA.setLatLng([lat, lon]);

        } else {

            marcadorA = L.marker([lat, lon])
                .addTo(mapa)
                .bindPopup("Parcela A");

        }

    } else {

        ubicacionB = ubicacion;

        const coordenadasB = document.getElementById("coordenadas-b");

        if (coordenadasB) {

            coordenadasB.textContent =
                `${lat.toFixed(4)}, ${lon.toFixed(4)}`;

        }

        if (marcadorB) {

            marcadorB.setLatLng([lat, lon]);

        } else {

            marcadorB = L.marker([lat, lon])
                .addTo(mapa)
                .bindPopup("Parcela B");

        }

    }

}


// =====================================================
// 8. OBTENER DATOS CLIMÁTICOS
// =====================================================

async function obtenerClima(lat, lon) {

    const parametros = new URLSearchParams({

        latitude: lat,

        longitude: lon,

        current:
            "temperature_2m,relative_humidity_2m,precipitation",

        hourly:
            "temperature_2m,precipitation,precipitation_probability,relative_humidity_2m,soil_moisture_0_to_1cm,soil_moisture_3_to_9cm,soil_temperature_6cm,et0_fao_evapotranspiration",

        daily:
            "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum",

        timezone: "auto",

        forecast_days: 7

    });

    const respuesta = await fetch(
        `https://api.open-meteo.com/v1/forecast?${parametros}`
    );

    if (!respuesta.ok) {

        throw new Error("Error al consultar el servicio climático.");

    }

    return await respuesta.json();

}


// =====================================================
// 9. CONSULTAR CLIMA
// =====================================================

async function consultarClima() {

    const boton = document.getElementById("consultar-clima");

    if (boton) {

        boton.disabled = true;

        boton.textContent = "Consultando...";

    }

    try {

        datosClima = await obtenerClima(
            latSeleccionada,
            lonSeleccionada
        );

        mostrarClima(datosClima);

        evaluarRiesgo(datosClima);

        mostrarRecomendaciones(datosClima);

        evaluarEnfermedades(datosClima);

    } catch (error) {

        console.error(error);

        const resultado = document.getElementById("resultado-riesgo");

        if (resultado) {

            resultado.textContent =
                "No se pudieron obtener los datos climáticos.";

        }

    } finally {

        if (boton) {

            boton.disabled = false;

            boton.textContent = "Consultar clima";

        }

    }

}


// =====================================================
// 10. ÍNDICE DE HORA ACTUAL
// =====================================================

function indiceHoraActual(datos) {

    const horaActual = datos.current.time.slice(0, 13) + ":00";

    const indice = datos.hourly.time.indexOf(horaActual);

    return indice >= 0 ? indice : 0;

}


// =====================================================
// 11. MOSTRAR CLIMA
// =====================================================

function mostrarClima(datos) {

    const indice = indiceHoraActual(datos);

    const humedadSuelo =
        datos.hourly.soil_moisture_0_to_1cm[indice];

    const temperatura = document.getElementById("temperatura");

    const precipitacion = document.getElementById("precipitacion");

    const humedad = document.getElementById("humedad");

    if (temperatura) {

        temperatura.textContent =
            datos.current.temperature_2m.toFixed(1) + " °C";

    }

    if (precipitacion) {

        precipitacion.textContent =
            datos.daily.precipitation_sum[0].toFixed(1) + " mm";

    }

    if (humedad) {

        humedad.textContent = humedadSuelo != null
            ? (humedadSuelo * 100).toFixed(0) + " %"
            : "Sin datos";

    }

}


// =====================================================
// 12. CLASIFICAR HUMEDAD
// =====================================================

function clasificarHumedad(valor) {

    if (valor < 0.15) return "Seco";

    if (valor < 0.35) return "Adecuado";

    return "Saturado";

}


// =====================================================
// 13. EVALUAR RIESGOS
// =====================================================

function evaluarRiesgo(datos) {

    const indice = indiceHoraActual(datos);

    const humedad =
        datos.hourly.soil_moisture_0_to_1cm[indice] ?? 0.25;

    const temperatura =
        Math.max(...datos.daily.temperature_2m_max.slice(0, 3));

    const lluvia =
        datos.daily.precipitation_sum
            .slice(0, 3)
            .reduce((a, b) => a + b, 0);

    let puntos = 0;

    const motivos = [];

    if (temperatura > 35) {

        puntos += 2;

        motivos.push("Temperatura elevada");

    } else if (temperatura > 31) {

        puntos++;

        motivos.push("Temperatura moderadamente alta");

    }

    if (lluvia > 60) {

        puntos += 2;

        motivos.push("Lluvias intensas");

    } else if (lluvia > 25) {

        puntos++;

        motivos.push("Lluvias abundantes");

    }

    if (humedad < 0.10) {

        puntos += 2;

        motivos.push("Suelo muy seco");

    } else if (humedad < 0.15 || humedad > 0.45) {

        puntos++;

        motivos.push("Humedad del suelo fuera del rango de referencia");

    }

    let nivel;

    let texto;

    if (puntos >= 3) {

        nivel = "rojo";

        texto = "🔴 Riesgo alto";

    } else if (puntos >= 1) {

        nivel = "amarillo";

        texto = "🟡 Riesgo moderado";

    } else {

        nivel = "verde";

        texto = "🟢 Riesgo bajo";

    }

    document.querySelectorAll(".riesgo").forEach(elemento => {

        elemento.classList.remove("activo");

    });

    const tarjeta = document.querySelector(`.riesgo.${nivel}`);

    if (tarjeta) tarjeta.classList.add("activo");

    const resultado = document.getElementById("resultado-riesgo");

    if (resultado) {

        resultado.innerHTML =
            `<strong>${texto}</strong><br>` +
            (motivos.length
                ? motivos.join(", ")
                : "Condiciones climáticas estables.");

    }

}


// =====================================================
// 14. RECOMENDACIONES
// =====================================================

function mostrarRecomendaciones(datos) {

    const indice = indiceHoraActual(datos);

    const humedad =
        datos.hourly.soil_moisture_0_to_1cm[indice] ?? 0.25;

    const temperatura =
        Math.max(...datos.daily.temperature_2m_max.slice(0, 3));

    const lluvia =
        datos.daily.precipitation_sum.reduce((a, b) => a + b, 0);

    const recomendaciones = [];

    if (humedad < 0.15) {

        recomendaciones.push(
            "💧 El suelo presenta poca humedad. Revisa las necesidades de riego."
        );

    }

    if (humedad > 0.45) {

        recomendaciones.push(
            "🌊 El suelo presenta mucha humedad. Revisa el drenaje."
        );

    }

    if (lluvia > 80) {

        recomendaciones.push(
            "🌧️ Se esperan lluvias abundantes. Vigila los cultivos y el drenaje."
        );

    }

    if (lluvia < 10) {

        recomendaciones.push(
            "☀️ Se esperan pocas precipitaciones. Monitorea la humedad del suelo."
        );

    }

    if (temperatura > 32) {

        recomendaciones.push(
            "🌡️ Se esperan temperaturas altas. Vigila el estrés térmico de los cultivos."
        );

    }

    if (recomendaciones.length === 0) {

        recomendaciones.push(
            "✅ Las condiciones climáticas se mantienen estables. Continúa monitoreando."
        );

    }

    const lista = document.getElementById("lista-recomendaciones");

    if (lista) {

        lista.innerHTML = recomendaciones
            .map(item => `<li>${item}</li>`)
            .join("");

    }

}


// =====================================================
// 15. PANEL DE ENFERMEDADES
// =====================================================

function crearPanelEnfermedades() {

    const seccion = document.getElementById("recomendaciones");

    if (!seccion || document.getElementById("panel-enfermedades")) {

        return;

    }

    const panel = document.createElement("div");

    panel.id = "panel-enfermedades";

    panel.className = "panel-enfermedades";

    panel.innerHTML = `

        <h2>🦠 Alertas de posibles enfermedades agrícolas</h2>

        <p>
            Análisis de condiciones climáticas que pueden favorecer
            algunas enfermedades.
        </p>

        <div id="alertas-enfermedades">

            Consulta el clima para generar alertas.

        </div>

        <small>
            Estas alertas son preventivas y no representan un diagnóstico.
        </small>

    `;

    seccion.appendChild(panel);

}


// =====================================================
// 16. EVALUAR ENFERMEDADES
// =====================================================

function evaluarEnfermedades(datos) {

    const alertas = [];

    const temperatura = datos.current.temperature_2m;

    const humedad = datos.current.relative_humidity_2m;

    const lluvia = datos.daily.precipitation_sum
        .slice(0, 3)
        .reduce((a, b) => a + b, 0);

    if (humedad >= 80 && lluvia >= 15) {

        alertas.push({

            nivel: "alto",

            titulo: "Posible riesgo de enfermedades fúngicas",

            descripcion:
                "La humedad y las precipitaciones pueden favorecer algunos hongos."

        });

    } else if (humedad >= 70 && lluvia >= 8) {

        alertas.push({

            nivel: "moderado",

            titulo: "Vigilancia de enfermedades fúngicas",

            descripcion:
                "Las condiciones requieren monitoreo de hojas y tallos."

        });

    }

    if (temperatura >= 24 && temperatura <= 32 && humedad >= 75) {

        alertas.push({

            nivel: "moderado",

            titulo: "Condiciones favorables para algunas enfermedades",

            descripcion:
                "Se recomienda vigilar el estado de los cultivos."

        });

    }

    const contenedor =
        document.getElementById("alertas-enfermedades");

    if (!contenedor) return;

    if (alertas.length === 0) {

        contenedor.innerHTML = `

            <div class="alerta-enfermedad bajo">

                🟢 No se detectaron condiciones climáticas destacadas de alerta.

            </div>

        `;

        return;

    }

    contenedor.innerHTML = alertas.map(alerta => `

        <div class="alerta-enfermedad ${alerta.nivel}">

            <strong>${alerta.titulo}</strong>

            <p>${alerta.descripcion}</p>

        </div>

    `).join("");

}


// =====================================================
// 17. COMPARAR PARCELAS
// =====================================================

async function compararParcelas() {

    const resultado =
        document.getElementById("resultado-comparacion");

    if (!ubicacionA || !ubicacionB) {

        resultado.textContent =
            "Primero debes seleccionar las parcelas A y B.";

        return;

    }

    resultado.textContent =
        "Consultando información climática...";

    try {

        const [climaA, climaB] = await Promise.all([

            obtenerClima(ubicacionA.lat, ubicacionA.lon),

            obtenerClima(ubicacionB.lat, ubicacionB.lon)

        ]);

        const temperaturaA = climaA.current.temperature_2m;

        const temperaturaB = climaB.current.temperature_2m;

        const humedadA = climaA.current.relative_humidity_2m;

        const humedadB = climaB.current.relative_humidity_2m;

        const lluviaA = climaA.daily.precipitation_sum
            .slice(0, 3)
            .reduce((a, b) => a + b, 0);

        const lluviaB = climaB.daily.precipitation_sum
            .slice(0, 3)
            .reduce((a, b) => a + b, 0);

        const indiceA = indiceHoraActual(climaA);

        const indiceB = indiceHoraActual(climaB);

        const sueloA =
            climaA.hourly.soil_moisture_0_to_1cm[indiceA];

        const sueloB =
            climaB.hourly.soil_moisture_0_to_1cm[indiceB];

        const puntuacionA = calcularPuntuacionParcela(
            temperaturaA,
            lluviaA,
            humedadA,
            sueloA
        );

        const puntuacionB = calcularPuntuacionParcela(
            temperaturaB,
            lluviaB,
            humedadB,
            sueloB
        );

        let ganador;

        if (puntuacionA > puntuacionB) {

            ganador = "La parcela A tiene mejores indicadores climáticos.";

        } else if (puntuacionB > puntuacionA) {

            ganador = "La parcela B tiene mejores indicadores climáticos.";

        } else {

            ganador = "Ambas parcelas presentan indicadores similares.";

        }

        resultado.innerHTML = `

            <div class="resultado-parcelas">

                <div class="tarjeta-comparacion">

                    <h3>🌱 Parcela A</h3>

                    <p>Temperatura: ${temperaturaA.toFixed(1)} °C</p>

                    <p>Humedad ambiental: ${humedadA}%</p>

                    <p>Precipitación: ${lluviaA.toFixed(1)} mm</p>

                    <p>Humedad del suelo:
                        ${sueloA != null
                            ? (sueloA * 100).toFixed(0) + "%"
                            : "Sin datos"}
                    </p>

                    <p>Puntuación: ${puntuacionA}/100</p>

                </div>

                <div class="tarjeta-comparacion">

                    <h3>🌾 Parcela B</h3>

                    <p>Temperatura: ${temperaturaB.toFixed(1)} °C</p>

                    <p>Humedad ambiental: ${humedadB}%</p>

                    <p>Precipitación: ${lluviaB.toFixed(1)} mm</p>

                    <p>Humedad del suelo:
                        ${sueloB != null
                            ? (sueloB * 100).toFixed(0) + "%"
                            : "Sin datos"}
                    </p>

                    <p>Puntuación: ${puntuacionB}/100</p>

                </div>

            </div>

            <h3>🏆 Resultado</h3>

            <p>${ganador}</p>

            <small>
                La puntuación es orientativa y no sustituye un análisis
                agronómico del suelo.
            </small>

        `;

    } catch (error) {

        console.error(error);

        resultado.textContent =
            "No fue posible comparar las parcelas. Intenta nuevamente.";

    }

}


// =====================================================
// 18. PUNTUACIÓN DE PARCELAS
// =====================================================

function calcularPuntuacionParcela(
    temperatura,
    lluvia,
    humedad,
    suelo
) {

    let puntos = 100;

    if (temperatura > 35) puntos -= 25;

    else if (temperatura > 32) puntos -= 12;

    else if (temperatura < 12) puntos -= 15;


    if (lluvia > 80) puntos -= 25;

    else if (lluvia > 60) puntos -= 12;

    else if (lluvia < 5) puntos -= 15;


    if (humedad > 90 || humedad < 35) puntos -= 15;


    if (suelo != null) {

        if (suelo < 0.10) puntos -= 15;

        else if (suelo > 0.45) puntos -= 10;

    }

    return Math.max(0, Math.min(100, puntos));

}


// =====================================================
// 19. ZONAS DEMOSTRATIVAS POR CULTIVO
// =====================================================

// Ubicaciones de ejemplo para visualizar en el mapa.
// No representan zonas oficiales de aptitud agrícola.

function crearZona(lat, lon, radio, color, descripcion) {

    return {
        lat,
        lon,
        radio,
        color,
        descripcion
    };

}


const zonasCultivos = {

    // FRUTAS

    fresa: [
        crearZona(10.05, -84.10, 15000, "red", "Zona demostrativa para fresa.")
    ],

    pina: [
        crearZona(10.15, -83.75, 20000, "orange", "Zona demostrativa para piña.")
    ],

    sandia: [
        crearZona(9.45, -84.15, 20000, "green", "Zona demostrativa para sandía.")
    ],

    melon: [
        crearZona(10.05, -85.45, 20000, "orange", "Zona demostrativa para melón.")
    ],

    papaya: [
        crearZona(9.95, -84.30, 18000, "green", "Zona demostrativa para papaya.")
    ],

    banano: [
        crearZona(9.65, -82.85, 22000, "green", "Zona demostrativa para banano.")
    ],

    mango: [
        crearZona(9.90, -84.55, 18000, "orange", "Zona demostrativa para mango.")
    ],

    naranja: [
        crearZona(10.45, -84.65, 18000, "orange", "Zona demostrativa para naranja.")
    ],

    limon: [
        crearZona(9.85, -83.10, 15000, "green", "Zona demostrativa para limón.")
    ],

    manzana: [
        crearZona(9.65, -83.85, 12000, "red", "Zona demostrativa para manzana.")
    ],

    aguacate: [
        crearZona(9.75, -84.25, 18000, "green", "Zona demostrativa para aguacate.")
    ],

    uva: [
        crearZona(10.00, -84.20, 12000, "purple", "Zona demostrativa para uva.")
    ],

    maracuya: [
        crearZona(10.10, -84.35, 15000, "purple", "Zona demostrativa para maracuyá.")
    ],

    mora: [
        crearZona(9.70, -83.80, 12000, "purple", "Zona demostrativa para mora.")
    ],

    guayaba: [
        crearZona(10.00, -84.45, 15000, "green", "Zona demostrativa para guayaba.")
    ],

    pitahaya: [
        crearZona(10.05, -84.50, 15000, "red", "Zona demostrativa para pitahaya.")
    ],

    guanabana: [
        crearZona(9.90, -84.00, 18000, "green", "Zona demostrativa para guanábana.")
    ],

    coco: [
        crearZona(9.60, -82.90, 20000, "green", "Zona demostrativa para coco.")
    ],

    durazno: [
        crearZona(9.65, -83.85, 12000, "orange", "Zona demostrativa para durazno.")
    ],

    pera: [
        crearZona(9.65, -83.85, 12000, "purple", "Zona demostrativa para pera.")
    ],


    // VERDURAS Y HORTALIZAS

    tomate: [
        crearZona(10.00, -84.20, 15000, "red", "Zona demostrativa para tomate.")
    ],

    lechuga: [
        crearZona(9.95, -84.10, 12000, "green", "Zona demostrativa para lechuga.")
    ],

    zanahoria: [
        crearZona(9.70, -83.85, 12000, "orange", "Zona demostrativa para zanahoria.")
    ],

    cebolla: [
        crearZona(9.85, -83.90, 12000, "purple", "Zona demostrativa para cebolla.")
    ],

    chile_dulce: [
        crearZona(10.00, -84.15, 15000, "red", "Zona demostrativa para chile dulce.")
    ],

    pepino: [
        crearZona(9.90, -84.25, 15000, "green", "Zona demostrativa para pepino.")
    ],

    papa: [
        crearZona(9.65, -83.85, 12000, "brown", "Zona demostrativa para papa.")
    ],

    yuca: [
        crearZona(10.00, -83.50, 18000, "orange", "Zona demostrativa para yuca.")
    ],

    camote: [
        crearZona(9.90, -84.30, 15000, "orange", "Zona demostrativa para camote.")
    ],

    brocoli: [
        crearZona(9.70, -83.85, 12000, "green", "Zona demostrativa para brócoli.")
    ],

    coliflor: [
        crearZona(9.70, -83.85, 12000, "purple", "Zona demostrativa para coliflor.")
    ],

    repollo: [
        crearZona(9.70, -83.85, 12000, "green", "Zona demostrativa para repollo.")
    ],

    espinaca: [
        crearZona(9.95, -84.10, 12000, "green", "Zona demostrativa para espinaca.")
    ],

    apio: [
        crearZona(9.75, -83.90, 12000, "green", "Zona demostrativa para apio.")
    ],

    culantro: [
        crearZona(10.00, -84.20, 12000, "green", "Zona demostrativa para culantro.")
    ],

    ajo: [
        crearZona(9.70, -83.85, 12000, "purple", "Zona demostrativa para ajo.")
    ],

    remolacha: [
        crearZona(9.70, -83.85, 12000, "red", "Zona demostrativa para remolacha.")
    ],

    rabano: [
        crearZona(9.95, -84.10, 12000, "red", "Zona demostrativa para rábano.")
    ],

    ayote: [
        crearZona(10.00, -84.30, 15000, "orange", "Zona demostrativa para ayote.")
    ],

    zucchini: [
        crearZona(9.95, -84.10, 12000, "green", "Zona demostrativa para zucchini.")
    ],

    berenjena: [
        crearZona(9.90, -84.25, 15000, "purple", "Zona demostrativa para berenjena.")
    ],

    chayote: [
        crearZona(10.20, -84.30, 15000, "green", "Zona demostrativa para chayote.")
    ],

    vainica: [
        crearZona(9.95, -84.20, 15000, "green", "Zona demostrativa para vainica.")
    ],

    elote: [
        crearZona(10.00, -84.15, 15000, "orange", "Zona demostrativa para elote.")
    ],


    // OTROS CULTIVOS

    cafe: [
        crearZona(9.8, -84.1, 20000, "green", "Zona demostrativa para café."),
        crearZona(10.0, -83.9, 15000, "green", "Zona demostrativa para café.")
    ],

    maiz: [
        crearZona(9.9, -84.05, 12000, "orange", "Zona demostrativa para maíz.")
    ],

    frijoles: [
        crearZona(10.0, -84.2, 15000, "blue", "Zona demostrativa para frijoles.")
    ],

    arroz: [
        crearZona(9.4, -84.1, 18000, "purple", "Zona demostrativa para arroz.")
    ],

    sorgo: [
        crearZona(9.6, -84.0, 15000, "orange", "Zona demostrativa para sorgo.")
    ]

};


// =====================================================
// 20. MOSTRAR ZONAS RECOMENDADAS
// =====================================================

function mostrarZonasRecomendadas(cultivo) {

    if (!mapa) return;

    if (capaZonasRecomendadas) {

        mapa.removeLayer(capaZonasRecomendadas);

    }

    const zonas = zonasCultivos[cultivo];

    const informacion =
        document.getElementById("zona-recomendada-info");

    if (!zonas || zonas.length === 0) {

        if (informacion) {
            informacion.textContent =
                "No hay zonas disponibles para este cultivo.";
        }

        return;

    }

    capaZonasRecomendadas = L.layerGroup();

    zonas.forEach(zona => {

        const circulo = L.circle(
            [zona.lat, zona.lon],
            {

                color: zona.color,

                fillColor: zona.color,

                fillOpacity: 0.3,

                radius: zona.radio

            }
        ).bindPopup(zona.descripcion);

        capaZonasRecomendadas.addLayer(circulo);

    });

    capaZonasRecomendadas.addTo(mapa);

    mapa.fitBounds(capaZonasRecomendadas.getBounds());

    if (informacion) {

        informacion.textContent =
            "Zonas demostrativas para el cultivo seleccionado. No son recomendaciones agronómicas oficiales.";

    }

}


// =====================================================
// 21. DATOS DE ROTACIÓN DE CULTIVOS
// =====================================================

const rotaciones = {

    maiz: {

        nombre: "Maíz",

        opciones: [

            {
                nombre: "Monocultivo",
                cultivos: ["Maíz", "Maíz", "Maíz"],
                salud: [70, 62, 54]
            },

            {
                nombre: "Rotación tradicional",
                cultivos: ["Maíz", "Frijoles", "Maíz"],
                salud: [70, 78, 80]
            },

            {
                nombre: "Rotación diversificada",
                cultivos: ["Maíz", "Frijoles", "Sorgo"],
                salud: [70, 78, 84]
            }

        ]

    },

    frijoles: {

        nombre: "Frijoles",

        opciones: [

            {
                nombre: "Monocultivo",
                cultivos: ["Frijoles", "Frijoles", "Frijoles"],
                salud: [72, 66, 60]
            },

            {
                nombre: "Rotación tradicional",
                cultivos: ["Frijoles", "Maíz", "Frijoles"],
                salud: [72, 74, 82]
            },

            {
                nombre: "Rotación diversificada",
                cultivos: ["Frijoles", "Sorgo", "Maíz"],
                salud: [72, 76, 85]
            }

        ]

    },

    arroz: {

        nombre: "Arroz",

        opciones: [

            {
                nombre: "Monocultivo",
                cultivos: ["Arroz", "Arroz", "Arroz"],
                salud: [68, 60, 52]
            },

            {
                nombre: "Rotación tradicional",
                cultivos: ["Arroz", "Frijoles", "Arroz"],
                salud: [68, 76, 78]
            },

            {
                nombre: "Rotación diversificada",
                cultivos: ["Arroz", "Sorgo", "Frijoles"],
                salud: [68, 72, 84]
            }

        ]

    },

    sorgo: {

        nombre: "Sorgo",

        opciones: [

            {
                nombre: "Monocultivo",
                cultivos: ["Sorgo", "Sorgo", "Sorgo"],
                salud: [71, 65, 59]
            },

            {
                nombre: "Rotación tradicional",
                cultivos: ["Sorgo", "Frijoles", "Maíz"],
                salud: [71, 79, 81]
            },

            {
                nombre: "Rotación diversificada",
                cultivos: ["Sorgo", "Maíz", "Frijoles"],
                salud: [71, 75, 86]
            }

        ]

    }

};


// =====================================================
// 22. GENERAR SIMULACIÓN DE ROTACIÓN
// =====================================================

function generarSimulacion() {

    const selector = document.getElementById("cultivo");

    const contenedor =
        document.getElementById("resultados-simulacion");

    const canvas =
        document.getElementById("grafico-rotacion");

    if (!selector || !contenedor || !canvas) {

        console.error("Faltan elementos del simulador en el HTML.");

        return;

    }

    const cultivo = selector.value;

    if (!cultivo || !rotaciones[cultivo]) {

        contenedor.innerHTML = `

            <h3>Resultados de la simulación</h3>

            <p>Selecciona un cultivo para comenzar la simulación.</p>

        `;

        if (graficoRotacion) {

            graficoRotacion.destroy();

            graficoRotacion = null;

        }

        return;

    }

    const datos = rotaciones[cultivo];


    // ---------------------------------
    // IDENTIFICAR MEJOR ALTERNATIVA
    // ---------------------------------

    const mejor = datos.opciones.reduce((a, b) => {

        return a.salud[2] > b.salud[2] ? a : b;

    });


    // ---------------------------------
    // MOSTRAR RESULTADOS
    // ---------------------------------

    contenedor.innerHTML = `

        <h3>📊 Resultados de la simulación</h3>

        <p>
            Cultivo inicial:
            <strong>${datos.nombre}</strong>
        </p>

        <div class="resultados-rotacion">

            ${datos.opciones.map(opcion => {

                const variacion =
                    opcion.salud[2] - opcion.salud[0];

                return `

                    <div class="tarjeta-comparacion">

                        <h3>${opcion.nombre}</h3>

                        <p><strong>Rotación durante tres años:</strong></p>

                        <ul>

                            <li>
                                Año 1: ${opcion.cultivos[0]}
                            </li>

                            <li>
                                Año 2: ${opcion.cultivos[1]}
                            </li>

                            <li>
                                Año 3: ${opcion.cultivos[2]}
                            </li>

                        </ul>

                        <p>
                            Fertilidad inicial:
                            <strong>${opcion.salud[0]}%</strong>
                        </p>

                        <p>
                            Fertilidad final:
                            <strong>${opcion.salud[2]}%</strong>
                        </p>

                        <p>
                            Variación:
                            <strong>
                                ${variacion > 0 ? "+" : ""}${variacion} puntos
                            </strong>
                        </p>

                    </div>

                `;

            }).join("")}

        </div>

        <div class="recomendacion-rotacion">

            <h3>🏆 Mejor alternativa</h3>

            <p>
                ${mejor.nombre}
            </p>

            <p>
                Secuencia:
                ${mejor.cultivos.join(" → ")}
            </p>

            <p>
                Índice final de salud del suelo:
                <strong>${mejor.salud[2]}%</strong>
            </p>

            <p>
                Esta alternativa presenta el mejor resultado
                dentro de los escenarios demostrativos.
            </p>

        </div>

        <small>
            Los porcentajes son valores simulados con fines educativos.
            No representan mediciones reales de fertilidad del suelo.
        </small>

    `;


    // ---------------------------------
    // COMPROBAR CHART.JS
    // ---------------------------------

    if (typeof Chart === "undefined") {

        console.error("Chart.js no está cargado.");

        return;

    }


    // ---------------------------------
    // ELIMINAR GRÁFICO ANTERIOR
    // ---------------------------------

    if (graficoRotacion) {

        graficoRotacion.destroy();

        graficoRotacion = null;

    }


    // ---------------------------------
    // CREAR GRÁFICO
    // ---------------------------------

    graficoRotacion = new Chart(canvas, {

        type: "line",

        data: {

            labels: [
                "Año 1",
                "Año 2",
                "Año 3"
            ],

            datasets: datos.opciones.map((opcion, indice) => ({

                label: opcion.nombre,

                data: opcion.salud,

                borderColor: [
                    "#c0392b",
                    "#27ae60",
                    "#2980b9"
                ][indice],

                backgroundColor: [
                    "rgba(192, 57, 43, 0.1)",
                    "rgba(39, 174, 96, 0.1)",
                    "rgba(41, 128, 185, 0.1)"
                ][indice],

                borderWidth: 3,

                pointRadius: 5,

                tension: 0.3,

                fill: false

            }))

        },

        options: {

            responsive: true,

            maintainAspectRatio: true,

            plugins: {

                title: {

                    display: true,

                    text: "Evolución de la fertilidad del suelo"

                },

                legend: {

                    display: true,

                    position: "bottom"

                }

            },

            scales: {

                y: {

                    min: 0,

                    max: 100,

                    title: {

                        display: true,

                        text: "Índice simulado de fertilidad (%)"

                    }

                },

                x: {

                    title: {

                        display: true,

                        text: "Periodo de rotación"

                    }

                }

            }

        }

    });

}


// =====================================================
// FIN DEL SCRIPT
// =====================================================