(function () {
    "use strict";
    const config = {
        // Pega aqui la URL del disparador HTTP de Power Automate.
        powerAutomateUrl: ""
    };
    const preguntas = ["Estado general de las llantas y refaccion", "Luces delanteras, traseras y de freno funcionales", "Luces direccionales e intermitentes operativas", "Espejos retrovisores completos y sin danos", "Parabrisas y ventanas enteras (sin estrelladuras)", "Limpiaparabrisas con plumas en buen estado", "Cinturon de seguridad del chofer funcional", "Asientos de pasajeros en buen estado y limpios", "Pasillos y escalones libres de obstaculos", "Extintor de incendios cargado y vigente", "Alarma sonora de reversa funcional", "Documentacion: Licencia de conducir vigente", "Documentacion: Tarjeta de circulacion y seguro vigentes", "Limpieza interior y exterior de la unidad", "Inspeccion visual de fugas (aceite, anticongelante)", "Tapon de tanque de combustible seguro", "Rotulacion y numero economico de la unidad visible", "Prueba general de frenos y freno de estacionamiento"];
    const rutas = ["Analco", "Bellavista", "Fundadores", "Hidalgo", "Los Pinos", "Manantiales", "Piedra Blanca", "Plan de Guadalupe", "Saltillo 2000", "Valle Poniente", "Zaragoza"];
    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
    function cargarRutas() { rutas.forEach((ruta) => { const option = document.createElement("option"); option.value = ruta; option.textContent = ruta; $("#inp_ruta").appendChild(option); }); }
    function renderizarPreguntas() {
        $("#contenedor-preguntas").innerHTML = preguntas.map((pregunta, index) => { const numero = index + 1; return `<article class="tarjeta-punto" data-num="${numero}"><h3 class="pregunta-titulo"><span>${numero}.</span> ${pregunta}</h3><div class="botones-estatus"><input type="radio" id="cumple_${numero}" name="estatus_${numero}" value="Cumple" class="radio-estatus"><label for="cumple_${numero}" class="btn-opcion btn-cumple">Cumple</label><input type="radio" id="nocumple_${numero}" name="estatus_${numero}" value="No Cumple" class="radio-estatus"><label for="nocumple_${numero}" class="btn-opcion btn-nocumple">No cumple</label></div><div class="campos-extra"><label class="sr-only" for="observacion_${numero}">Observacion del punto ${numero}</label><input type="text" id="observacion_${numero}" class="observacion form-control" placeholder="Observacion (opcional)"><label for="foto_${numero}" class="foto-label">Foto (opcional)</label><input type="file" id="foto_${numero}" accept="image/*" capture="environment" class="foto-input"><span class="foto-nombre" aria-live="polite"></span><input type="hidden" class="foto-base64"></div></article>`; }).join("");
    }
    function actualizarProgreso() { const contestadas = $$(".radio-estatus:checked").length, porcentaje = Math.round((contestadas / preguntas.length) * 100); $("#barra-progreso").style.width = `${porcentaje}%`; $("#texto-progreso").textContent = `${porcentaje}% completado (${contestadas} de ${preguntas.length})`; $("#contenedor-progreso").setAttribute("aria-valuenow", porcentaje); }
    function comprimirFoto(input) {
        const tarjeta = input.closest(".tarjeta-punto"), salida = $(".foto-base64", tarjeta), nombre = $(".foto-nombre", tarjeta), file = input.files[0];
        if (!file) { salida.value = ""; nombre.textContent = ""; return; }
        if (!file.type.startsWith("image/")) { input.value = ""; nombre.textContent = "Archivo no valido"; return; }
        nombre.textContent = "Procesando foto...";
        const reader = new FileReader(); reader.onload = (event) => { const image = new Image(); image.onload = () => { const scale = Math.min(1, 900 / image.width, 900 / image.height), canvas = document.createElement("canvas"); canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale)); canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height); salida.value = canvas.toDataURL("image/jpeg", 0.65); nombre.textContent = "Foto lista"; }; image.onerror = () => { salida.value = ""; nombre.textContent = "No se pudo leer la foto"; }; image.src = event.target.result; }; reader.readAsDataURL(file);
    }
    function construirPayload() { return { nombre: `Auditoria ${$("#inp_unidad").value.trim()} - ${$("#inp_ruta").value}`, fecha: new Date().toISOString(), conductor: $("#inp_conductor").value.trim(), unidad: $("#inp_unidad").value.trim(), placas: $("#inp_placas").value.trim(), ruta: $("#inp_ruta").value, puntos: $$(".tarjeta-punto").map((tarjeta) => ({ numeroPunto: Number(tarjeta.dataset.num), pregunta: $(".pregunta-titulo", tarjeta).textContent.replace(/^\d+\.\s*/, ""), estatus: $(".radio-estatus:checked", tarjeta)?.value || "Sin evaluar", observacion: $(".observacion", tarjeta).value.trim(), fotoBase64: $(".foto-base64", tarjeta).value || "" })) }; }
    function generarPdf(payload) {
        if (!window.jspdf || !window.jspdf.jsPDF) throw new Error("No se pudo cargar el generador PDF");
        const pdf = new window.jspdf.jsPDF(), nombreArchivo = `${payload.nombre.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}.pdf`;
        let y = 18;
        const nuevaPaginaSiEsNecesario = (alto = 10) => { if (y + alto > 280) { pdf.addPage(); y = 18; } };
        pdf.setFontSize(16); pdf.text("Auditoria de Transportes", 15, y); y += 10;
        pdf.setFontSize(10); pdf.text(`Fecha: ${new Date(payload.fecha).toLocaleString("es-MX")}`, 15, y); y += 6;
        pdf.text(`Conductor: ${payload.conductor}`, 15, y); y += 6;
        pdf.text(`Unidad: ${payload.unidad}   Placas: ${payload.placas || "Sin placas"}`, 15, y); y += 6;
        pdf.text(`Ruta: ${payload.ruta}`, 15, y); y += 10;
        payload.puntos.forEach((punto) => {
            const lineas = pdf.splitTextToSize(`${punto.numeroPunto}. ${punto.pregunta}`, 175);
            nuevaPaginaSiEsNecesario(10 + lineas.length * 5); pdf.setFont(undefined, "bold"); pdf.text(lineas, 15, y); y += lineas.length * 5;
            pdf.setFont(undefined, "normal"); pdf.text(`Estatus: ${punto.estatus}`, 20, y); y += 5;
            if (punto.observacion) { const observacion = pdf.splitTextToSize(`Observacion: ${punto.observacion}`, 170); nuevaPaginaSiEsNecesario(observacion.length * 5); pdf.text(observacion, 20, y); y += observacion.length * 5; }
            if (punto.fotoBase64) { nuevaPaginaSiEsNecesario(42); pdf.addImage(punto.fotoBase64, "JPEG", 20, y, 45, 35); y += 40; }
            y += 4;
        });
        return { nombreArchivo, base64: pdf.output("datauristring").split(",")[1] };
    }
    function mostrarMensaje(texto, error) { const mensaje = $("#mensaje"); mensaje.textContent = texto; mensaje.className = `mensaje ${error ? "mensaje-error" : "mensaje-ok"}`; }
    async function guardarAuditoria() {
        const boton = $("#btn-guardar-api"), url = String(config.powerAutomateUrl || "").trim();
        if (!url) { mostrarMensaje("Configura la URL de Power Automate antes de guardar.", true); return; }
        if (!$("#inp_conductor").value.trim() || !$("#inp_unidad").value.trim() || !$("#inp_ruta").value) { mostrarMensaje("Completa Conductor, Unidad y Ruta.", true); return; }
        const pendientes = preguntas.length - $$(".radio-estatus:checked").length; if (pendientes && !window.confirm(`Faltan ${pendientes} puntos. ¿Guardar de todas formas?`)) return;
        boton.disabled = true; $("#pantalla-carga").hidden = false;
        try { const payload = construirPayload(), pdf = generarPdf(payload); payload.pdfNombre = pdf.nombreArchivo; payload.pdfBase64 = pdf.base64; const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); if (!response.ok) throw new Error(`HTTP ${response.status}`); mostrarMensaje("Auditoria y PDF enviados correctamente a SharePoint.", false); } catch (error) { console.error(error); mostrarMensaje("No se pudo guardar la auditoria o el PDF. Revisa la configuracion.", true); } finally { $("#pantalla-carga").hidden = true; boton.disabled = false; }
    }
    function descargarPdf() { try { const payload = construirPayload(), pdf = generarPdf(payload), enlace = document.createElement("a"); enlace.href = `data:application/pdf;base64,${pdf.base64}`; enlace.download = pdf.nombreArchivo; enlace.click(); } catch (error) { console.error(error); mostrarMensaje("No se pudo generar el PDF.", true); } }
    document.addEventListener("change", (event) => { if (event.target.matches(".radio-estatus")) actualizarProgreso(); if (event.target.matches(".foto-input")) comprimirFoto(event.target); });
    $("#btn-guardar-api").addEventListener("click", guardarAuditoria); $("#btn-descargar-pdf").addEventListener("click", descargarPdf); $("#btn-nueva-auditoria").addEventListener("click", () => { if (window.confirm("¿Limpiar todo?")) window.location.reload(); }); cargarRutas(); renderizarPreguntas();
})();