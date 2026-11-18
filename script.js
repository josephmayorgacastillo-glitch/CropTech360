// =====================================================
// CropTech 360
// Smart Agriculture System
// =====================================================


// =====================================================
// 1. GLOBAL VARIABLES
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
// 2. INITIALIZATION
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
                        ? "Select a crop."
                        : "Press the button to view the areas.";
            }

        });

    // Crop rotation simulator event
    document.getElementById("simular")
        ?.addEventListener("click", generarSimulacion);

    crearPanelEnfermedades();

    iniciarAnimacion();

});


// =====================================================
// 3. ENTRY ANIMATION
// =====================================================

function iniciarAnimacion() {

    document.body.classList.add("animacion-entrada");

    setTimeout(() => {

        document.body.classList.remove("animacion-entrada");

    }, 1800);

}


// =====================================================
// 4. INITIALIZE MAP
// =====================================================

function iniciarMapa() {

    const elementoMapa = document.getElementById("mapa-interactivo");

    if (!elementoMapa || typeof L === "undefined") {

        console.error("Leaflet or the map container could not be found.");

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
// 5. UPDATE COORDINATES
// =====================================================

function actualizarCoordenadas(lat, lon) {

    const latitud = document.getElementById("latitud");

    const longitud = document.getElementById("longitud");

    if (latitud) latitud.textContent = lat.toFixed(4);

    if (longitud) longitud.textContent = lon.toFixed(4);

}


// =====================================================
// 6. SELECT PLOT
// =====================================================

function seleccionarParcela(letra) {

    parcelaActiva = letra;

    document.getElementById("seleccionar-a")
        ?.classList.toggle("parcela-activa", letra === "A");

    document.getElementById("seleccionar-b")
        ?.classList.toggle("parcela-activa", letra === "B");

    alert("Select the location of plot " + letra + " on the map.");

}


// =====================================================
// 7. REGISTER LOCATIONS
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
                .bindPopup("Plot A");

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
                .bindPopup("Plot B");

        }

    }

}


// =====================================================
// 8. GET CLIMATE DATA
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

        throw new Error("Error while retrieving climate data.");

    }

    return await respuesta.json();

}


// =====================================================
// 9. CHECK CLIMATE
// =====================================================

async function consultarClima() {

    const boton = document.getElementById("consultar-clima");

    if (boton) {

        boton.disabled = true;

        boton.textContent = "Loading...";

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
                "Climate data could not be retrieved.";

        }

    } finally {

        if (boton) {

            boton.disabled = false;

            boton.textContent = "Check Climate";

        }

    }

}


// =====================================================
// 10. CURRENT HOUR INDEX
// =====================================================

function indiceHoraActual(datos) {

    const horaActual = datos.current.time.slice(0, 13) + ":00";

    const indice = datos.hourly.time.indexOf(horaActual);

    return indice >= 0 ? indice : 0;

}


// =====================================================
// 11. DISPLAY CLIMATE DATA
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
            : "No data";

    }

}


// =====================================================
// 12. CLASSIFY MOISTURE
// =====================================================

function clasificarHumedad(valor) {

    if (valor < 0.15) return "Dry";

    if (valor < 0.35) return "Adequate";

    return "Saturated";

}


// =====================================================
// 13. EVALUATE RISKS
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

        motivos.push("High temperature");

    } else if (temperatura > 31) {

        puntos++;

        motivos.push("Moderately high temperature");

    }

    if (lluvia > 60) {

        puntos += 2;

        motivos.push("Heavy rainfall");

    } else if (lluvia > 25) {

        puntos++;

        motivos.push("Abundant rainfall");

    }

    if (humedad < 0.10) {

        puntos += 2;

        motivos.push("Very dry soil");

    } else if (humedad < 0.15 || humedad > 0.45) {

        puntos++;

        motivos.push("Soil moisture outside the reference range");

    }

    let nivel;

    let texto;

    if (puntos >= 3) {

        nivel = "rojo";

        texto = "🔴 High Risk";

    } else if (puntos >= 1) {

        nivel = "amarillo";

        texto = "🟡 Moderate Risk";

    } else {

        nivel = "verde";

        texto = "🟢 Low Risk";

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
                : "Stable climate conditions.");

    }

}


// =====================================================
// 14. RECOMMENDATIONS
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
            "💧 The soil has low moisture levels. Check irrigation requirements."
        );

    }

    if (humedad > 0.45) {

        recomendaciones.push(
            "🌊 The soil has high moisture levels. Check drainage."
        );

    }

    if (lluvia > 80) {

        recomendaciones.push(
            "🌧️ Heavy rainfall is expected. Monitor crops and drainage."
        );

    }

    if (lluvia < 10) {

        recomendaciones.push(
            "☀️ Low rainfall is expected. Monitor soil moisture."
        );

    }

    if (temperatura > 32) {

        recomendaciones.push(
            "🌡️ High temperatures are expected. Monitor crop heat stress."
        );

    }

    if (recomendaciones.length === 0) {

        recomendaciones.push(
            "✅ Climate conditions remain stable. Continue monitoring."
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
// 15. DISEASE PANEL
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

        <h2>🦠 Agricultural Disease Alerts</h2>

        <p>
            Analysis of climate conditions that may favor
            certain diseases.
        </p>

        <div id="alertas-enfermedades">

            Check the weather to generate alerts.

        </div>

        <small>
            These alerts are preventive and do not represent a diagnosis.
        </small>

    `;

    seccion.appendChild(panel);

}


// =====================================================
// 16. EVALUATE DISEASES
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

            titulo: "Possible risk of fungal diseases",

            descripcion:
                "Humidity and rainfall may favor the growth of certain fungi."

        });

    } else if (humedad >= 70 && lluvia >= 8) {

        alertas.push({

            nivel: "moderado",

            titulo: "Monitor for fungal diseases",

            descripcion:
                "Conditions require monitoring of leaves and stems."

        });

    }

    if (temperatura >= 24 && temperatura <= 32 && humedad >= 75) {

        alertas.push({

            nivel: "moderado",

            titulo: "Conditions favorable for certain diseases",

            descripcion:
                "Monitoring crop health is recommended."

        });

    }

    const contenedor =
        document.getElementById("alertas-enfermedades");

    if (!contenedor) return;

    if (alertas.length === 0) {

        contenedor.innerHTML = `

            <div class="alerta-enfermedad bajo">

                🟢 No significant climate-related warning conditions were detected.

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
// 17. COMPARE PLOTS
// =====================================================

async function compararParcelas() {

    const resultado =
        document.getElementById("resultado-comparacion");

    if (!ubicacionA || !ubicacionB) {

        resultado.textContent =
            "You must first select plots A and B.";

        return;

    }

    resultado.textContent =
        "Retrieving climate information...";

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

            ganador = "Plot A has better climate indicators.";

        } else if (puntuacionB > puntuacionA) {

            ganador = "Plot B has better climate indicators.";

        } else {

            ganador = "Both plots have similar indicators.";

        }

        resultado.innerHTML = `

            <div class="resultado-parcelas">

                <div class="tarjeta-comparacion">

                    <h3>🌱 Plot A</h3>

                    <p>Temperature: ${temperaturaA.toFixed(1)} °C</p>

                    <p>Relative Humidity: ${humedadA}%</p>

                    <p>Precipitation: ${lluviaA.toFixed(1)} mm</p>

                    <p>Soil Moisture:
                        ${sueloA != null
                            ? (sueloA * 100).toFixed(0) + "%"
                            : "No data"}
                    </p>

                    <p>Score: ${puntuacionA}/100</p>

                </div>

                <div class="tarjeta-comparacion">

                    <h3>🌾 Plot B</h3>

                    <p>Temperature: ${temperaturaB.toFixed(1)} °C</p>

                    <p>Relative Humidity: ${humedadB}%</p>

                    <p>Precipitation: ${lluviaB.toFixed(1)} mm</p>

                    <p>Soil Moisture:
                        ${sueloB != null
                            ? (sueloB * 100).toFixed(0) + "%"
                            : "No data"}
                    </p>

                    <p>Score: ${puntuacionB}/100</p>

                </div>

            </div>

            <h3>🏆 Result</h3>

            <p>${ganador}</p>

            <small>
                The score is indicative and does not replace a soil
                agronomic analysis.
            </small>

        `;

    } catch (error) {

        console.error(error);

        resultado.textContent =
            "The plots could not be compared. Please try again.";

    }

}


// =====================================================
// 18. PLOT SCORE
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
// 19. DEMONSTRATION AREAS BY CROP
// =====================================================

// Example locations for map visualization.
// They do not represent official agricultural suitability areas.

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

    // FRUITS

    fresa: [
        crearZona(10.05, -84.10, 15000, "red", "Demonstration area for strawberries.")
    ],

    pina: [
        crearZona(10.15, -83.75, 20000, "orange", "Demonstration area for pineapples.")
    ],

    sandia: [
        crearZona(9.45, -84.15, 20000, "green", "Demonstration area for watermelons.")
    ],

    melon: [
        crearZona(10.05, -85.45, 20000, "orange", "Demonstration area for melons.")
    ],

    papaya: [
        crearZona(9.95, -84.30, 18000, "green", "Demonstration area for papayas.")
    ],

    banano: [
        crearZona(9.65, -82.85, 22000, "green", "Demonstration area for bananas.")
    ],

    mango: [
        crearZona(9.90, -84.55, 18000, "orange", "Demonstration area for mangoes.")
    ],

    naranja: [
        crearZona(10.45, -84.65, 18000, "orange", "Demonstration area for oranges.")
    ],

    limon: [
        crearZona(9.85, -83.10, 15000, "green", "Demonstration area for lemons.")
    ],

    manzana: [
        crearZona(9.65, -83.85, 12000, "red", "Demonstration area for apples.")
    ],

    aguacate: [
        crearZona(9.75, -84.25, 18000, "green", "Demonstration area for avocados.")
    ],

    uva: [
        crearZona(10.00, -84.20, 12000, "purple", "Demonstration area for grapes.")
    ],

    maracuya: [
        crearZona(10.10, -84.35, 15000, "purple", "Demonstration area for passion fruit.")
    ],

    mora: [
        crearZona(9.70, -83.80, 12000, "purple", "Demonstration area for blackberries.")
    ],

    guayaba: [
        crearZona(10.00, -84.45, 15000, "green", "Demonstration area for guavas.")
    ],

    pitahaya: [
        crearZona(10.05, -84.50, 15000, "red", "Demonstration area for dragon fruit.")
    ],

    guanabana: [
        crearZona(9.90, -84.00, 18000, "green", "Demonstration area for soursop.")
    ],

    coco: [
        crearZona(9.60, -82.90, 20000, "green", "Demonstration area for coconuts.")
    ],

    durazno: [
        crearZona(9.65, -83.85, 12000, "orange", "Demonstration area for peaches.")
    ],

    pera: [
        crearZona(9.65, -83.85, 12000, "purple", "Demonstration area for pears.")
    ],


    // VEGETABLES AND GREENS

    tomate: [
        crearZona(10.00, -84.20, 15000, "red", "Demonstration area for tomatoes.")
    ],

    lechuga: [
        crearZona(9.95, -84.10, 12000, "green", "Demonstration area for lettuce.")
    ],

    zanahoria: [
        crearZona(9.70, -83.85, 12000, "orange", "Demonstration area for carrots.")
    ],

    cebolla: [
        crearZona(9.85, -83.90, 12000, "purple", "Demonstration area for onions.")
    ],

    chile_dulce: [
        crearZona(10.00, -84.15, 15000, "red", "Demonstration area for sweet peppers.")
    ],

    pepino: [
        crearZona(9.90, -84.25, 15000, "green", "Demonstration area for cucumbers.")
    ],

    papa: [
        crearZona(9.65, -83.85, 12000, "brown", "Demonstration area for potatoes.")
    ],

    yuca: [
        crearZona(10.00, -83.50, 18000, "orange", "Demonstration area for cassava.")
    ],

    camote: [
        crearZona(9.90, -84.30, 15000, "orange", "Demonstration area for sweet potatoes.")
    ],

    brocoli: [
        crearZona(9.70, -83.85, 12000, "green", "Demonstration area for broccoli.")
    ],

    coliflor: [
        crearZona(9.70, -83.85, 12000, "purple", "Demonstration area for cauliflower.")
    ],

    repollo: [
        crearZona(9.70, -83.85, 12000, "green", "Demonstration area for cabbage.")
    ],

    espinaca: [
        crearZona(9.95, -84.10, 12000, "green", "Demonstration area for spinach.")
    ],

    apio: [
        crearZona(9.75, -83.90, 12000, "green", "Demonstration area for celery.")
    ],

    culantro: [
        crearZona(10.00, -84.20, 12000, "green", "Demonstration area for cilantro.")
    ],

    ajo: [
        crearZona(9.70, -83.85, 12000, "purple", "Demonstration area for garlic.")
    ],

    remolacha: [
        crearZona(9.70, -83.85, 12000, "red", "Demonstration area for beets.")
    ],

    rabano: [
        crearZona(9.95, -84.10, 12000, "red", "Demonstration area for radishes.")
    ],

    ayote: [
        crearZona(10.00, -84.30, 15000, "orange", "Demonstration area for squash.")
    ],

    zucchini: [
        crearZona(9.95, -84.10, 12000, "green", "Demonstration area for zucchini.")
    ],

    berenjena: [
        crearZona(9.90, -84.25, 15000, "purple", "Demonstration area for eggplants.")
    ],

    chayote: [
        crearZona(10.20, -84.30, 15000, "green", "Demonstration area for chayote.")
    ],

    vainica: [
        crearZona(9.95, -84.20, 15000, "green", "Demonstration area for green beans.")
    ],

    elote: [
        crearZona(10.00, -84.15, 15000, "orange", "Demonstration area for corn.")
    ],


    // OTHER CROPS

    cafe: [
        crearZona(9.8, -84.1, 20000, "green", "Demonstration area for coffee."),
        crearZona(10.0, -83.9, 15000, "green", "Demonstration area for coffee.")
    ],

    maiz: [
        crearZona(9.9, -84.05, 12000, "orange", "Demonstration area for corn.")
    ],

    frijoles: [
        crearZona(10.0, -84.2, 15000, "blue", "Demonstration area for beans.")
    ],

    arroz: [
        crearZona(9.4, -84.1, 18000, "purple", "Demonstration area for rice.")
    ],

    sorgo: [
        crearZona(9.6, -84.0, 15000, "orange", "Demonstration area for sorghum.")
    ]

};


// =====================================================
// 20. DISPLAY RECOMMENDED AREAS
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
                "No areas are available for this crop.";
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
            "Demonstration areas for the selected crop. These are not official agricultural recommendations.";

    }

}


// =====================================================
// 21. CROP ROTATION DATA
// =====================================================

const rotaciones = {

    maiz: {

        nombre: "Corn",

        opciones: [

            {
                nombre: "Monoculture",
                cultivos: ["Corn", "Corn", "Corn"],
                salud: [70, 62, 54]
            },

            {
                nombre: "Traditional Rotation",
                cultivos: ["Corn", "Beans", "Corn"],
                salud: [70, 78, 80]
            },

            {
                nombre: "Diversified Rotation",
                cultivos: ["Corn", "Beans", "Sorghum"],
                salud: [70, 78, 84]
            }

        ]

    },

    frijoles: {

        nombre: "Beans",

        opciones: [

            {
                nombre: "Monoculture",
                cultivos: ["Beans", "Beans", "Beans"],
                salud: [72, 66, 60]
            },

            {
                nombre: "Traditional Rotation",
                cultivos: ["Beans", "Corn", "Beans"],
                salud: [72, 74, 82]
            },

            {
                nombre: "Diversified Rotation",
                cultivos: ["Beans", "Sorghum", "Corn"],
                salud: [72, 76, 85]
            }

        ]

    },

    arroz: {

        nombre: "Rice",

        opciones: [

            {
                nombre: "Monoculture",
                cultivos: ["Rice", "Rice", "Rice"],
                salud: [68, 60, 52]
            },

            {
                nombre: "Traditional Rotation",
                cultivos: ["Rice", "Beans", "Rice"],
                salud: [68, 76, 78]
            },

            {
                nombre: "Diversified Rotation",
                cultivos: ["Rice", "Sorghum", "Beans"],
                salud: [68, 72, 84]
            }

        ]

    },

    sorgo: {

        nombre: "Sorghum",

        opciones: [

            {
                nombre: "Monoculture",
                cultivos: ["Sorghum", "Sorghum", "Sorghum"],
                salud: [71, 65, 59]
            },

            {
                nombre: "Traditional Rotation",
                cultivos: ["Sorghum", "Beans", "Corn"],
                salud: [71, 79, 81]
            },

            {
                nombre: "Diversified Rotation",
                cultivos: ["Sorghum", "Corn", "Beans"],
                salud: [71, 75, 86]
            }

        ]

    }

};


// =====================================================
// 22. GENERATE CROP ROTATION SIMULATION
// =====================================================

function generarSimulacion() {

    const selector = document.getElementById("cultivo");

    const contenedor =
        document.getElementById("resultados-simulacion");

    const canvas =
        document.getElementById("grafico-rotacion");

    if (!selector || !contenedor || !canvas) {

        console.error("Simulator elements are missing from the HTML.");

        return;

    }

    const cultivo = selector.value;

    if (!cultivo || !rotaciones[cultivo]) {

        contenedor.innerHTML = `

            <h3>Simulation Results</h3>

            <p>Select a crop to start the simulation.</p>

        `;

        if (graficoRotacion) {

            graficoRotacion.destroy();

            graficoRotacion = null;

        }

        return;

    }

    const datos = rotaciones[cultivo];


    // ---------------------------------
    // IDENTIFY THE BEST ALTERNATIVE
    // ---------------------------------

    const mejor = datos.opciones.reduce((a, b) => {

        return a.salud[2] > b.salud[2] ? a : b;

    });


    // ---------------------------------
    // DISPLAY RESULTS
    // ---------------------------------

    contenedor.innerHTML = `

        <h3>📊 Simulation Results</h3>

        <p>
            Initial Crop:
            <strong>${datos.nombre}</strong>
        </p>

        <div class="resultados-rotacion">

            ${datos.opciones.map(opcion => {

                const variacion =
                    opcion.salud[2] - opcion.salud[0];

                return `

                    <div class="tarjeta-comparacion">

                        <h3>${opcion.nombre}</h3>

                        <p><strong>Three-Year Crop Rotation:</strong></p>

                        <ul>

                            <li>
                                Year 1: ${opcion.cultivos[0]}
                            </li>

                            <li>
                                Year 2: ${opcion.cultivos[1]}
                            </li>

                            <li>
                                Year 3: ${opcion.cultivos[2]}
                            </li>

                        </ul>

                        <p>
                            Initial Fertility:
                            <strong>${opcion.salud[0]}%</strong>
                        </p>

                        <p>
                            Final Fertility:
                            <strong>${opcion.salud[2]}%</strong>
                        </p>

                        <p>
                            Variation:
                            <strong>
                                ${variacion > 0 ? "+" : ""}${variacion} points
                            </strong>
                        </p>

                    </div>

                `;

            }).join("")}

        </div>

        <div class="recomendacion-rotacion">

            <h3>🏆 Best Alternative</h3>

            <p>
                ${mejor.nombre}
            </p>

            <p>
                Sequence:
                ${mejor.cultivos.join(" → ")}
            </p>

            <p>
                Final Soil Health Index:
                <strong>${mejor.salud[2]}%</strong>
            </p>

            <p>
                This alternative provides the best result
                among the demonstration scenarios.
            </p>

        </div>

        <small>
            The percentages are simulated values for educational purposes.
            They do not represent actual soil fertility measurements.
        </small>

    `;


    // ---------------------------------
    // CHECK CHART.JS
    // ---------------------------------

    if (typeof Chart === "undefined") {

        console.error("Chart.js is not loaded.");

        return;

    }


    // ---------------------------------
    // REMOVE PREVIOUS CHART
    // ---------------------------------

    if (graficoRotacion) {

        graficoRotacion.destroy();

        graficoRotacion = null;

    }


    // ---------------------------------
    // CREATE CHART
    // ---------------------------------

    graficoRotacion = new Chart(canvas, {

        type: "line",

        data: {

            labels: [
                "Year 1",
                "Year 2",
                "Year 3"
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

                    text: "Soil Fertility Progression"

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

                        text: "Simulated Fertility Index (%)"

                    }

                },

                x: {

                    title: {

                        display: true,

                        text: "Rotation Period"

                    }

                }

            }

        }

    });

}


// =====================================================
// END OF SCRIPT
// =====================================================