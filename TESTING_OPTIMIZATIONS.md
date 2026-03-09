# Guía de Testing - Optimizaciones de Rendimiento

## 🧪 Cómo Probar las Optimizaciones

### 1. **Prueba de Carga Inicial**

```bash
# Terminal 1: Backend
cd backend
npm start

# Terminal 2: Frontend
cd frontend
npm run dev
```

**Verificar:**
- ✅ La página carga en menos de 2 segundos
- ✅ El hero section aparece rápidamente
- ✅ Las animaciones son fluidas

---

### 2. **Prueba de Rendimiento en DevTools**

#### Paso 1: Abrir DevTools
- Presionar `F12` o `Ctrl+Shift+I`

#### Paso 2: Performance Tab
1. Click en la pestaña **Performance**
2. Click en el botón de grabar (círculo rojo)
3. Esperar 5 segundos
4. Click en el botón de grabar nuevamente

**Verificar:**
- ✅ FPS debe estar entre 50-60
- ✅ CPU usage debe ser bajo (verde)
- ✅ Memory debe ser estable

#### Paso 3: Network Tab
1. Click en la pestaña **Network**
2. Recargar la página (Ctrl+R)

**Verificar:**
- ✅ Tamaño total < 5MB
- ✅ Tiempo de carga < 3 segundos
- ✅ Imágenes optimizadas

---

### 3. **Prueba en Mobile**

#### Opción A: Chrome DevTools Mobile Emulation
1. Abrir DevTools (F12)
2. Click en el icono de dispositivo (esquina superior izquierda)
3. Seleccionar "iPhone 12" o "Pixel 5"

**Verificar:**
- ✅ Página carga rápido en mobile
- ✅ Scroll es fluido
- ✅ Animaciones no causan lag
- ✅ Menos de 3 metaballs visibles

#### Opción B: Dispositivo Real
1. Conectar dispositivo al mismo WiFi
2. Obtener IP local: `ipconfig` (Windows) o `ifconfig` (Mac/Linux)
3. Acceder a: `http://<IP>:3000`

**Verificar:**
- ✅ Carga rápida en 4G/5G
- ✅ Sin lag en scroll
- ✅ Animaciones suaves

---

### 4. **Prueba de Animaciones**

#### Desktop
1. Mover el mouse sobre el hero section
2. Verificar que la imagen sigue el mouse suavemente

**Verificar:**
- ✅ Efecto parallax funciona
- ✅ Sin stuttering
- ✅ Transiciones suaves

#### Mobile
1. Inclinar el dispositivo
2. Verificar que la imagen responde al movimiento

**Verificar:**
- ✅ Efecto de orientación funciona
- ✅ Sin lag
- ✅ Suave y responsivo

---

### 5. **Prueba de Lava Lamp**

1. Observar el fondo animado del hero
2. Contar los "blobs" animados

**Verificar Desktop:**
- ✅ 4 capas con 4 metaballs cada una
- ✅ Animación suave
- ✅ Sin stuttering

**Verificar Mobile:**
- ✅ 3 capas con 3 metaballs cada una
- ✅ Animación suave
- ✅ Mejor rendimiento que desktop

---

### 6. **Prueba de Scroll Performance**

1. Abrir DevTools → Performance
2. Grabar mientras scrolleas la página
3. Parar la grabación

**Verificar:**
- ✅ FPS constante en 60
- ✅ Sin jank o stuttering
- ✅ Scroll suave

---

### 7. **Prueba de Memory Leak**

1. Abrir DevTools → Memory
2. Click en "Take heap snapshot"
3. Hacer varias acciones (scroll, click, etc.)
4. Esperar 30 segundos
5. Click en "Take heap snapshot" nuevamente

**Verificar:**
- ✅ Memory no aumenta significativamente
- ✅ Garbage collection funciona
- ✅ Sin memory leaks

---

### 8. **Prueba de Lighthouse**

1. Abrir DevTools
2. Click en pestaña **Lighthouse**
3. Seleccionar "Mobile" o "Desktop"
4. Click en "Analyze page load"

**Verificar:**
- ✅ Performance score > 85
- ✅ Accessibility > 90
- ✅ Best Practices > 90

---

## 📊 Comparación Antes/Después

### Métricas Esperadas

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| First Paint | 1.5s | 0.9s | 40% ↓ |
| FCP | 2.0s | 1.2s | 40% ↓ |
| LCP | 2.5s | 1.5s | 40% ↓ |
| FPS (Mobile) | 30-40 | 50-60 | 50% ↑ |
| CPU Usage | Alto | Bajo | 40% ↓ |
| Memory | 150MB | 100MB | 33% ↓ |

---

## 🔍 Debugging

### Si la página se tilda:

1. **Abrir Console (F12 → Console)**
2. **Buscar errores** (líneas rojas)
3. **Verificar Network tab** para recursos lentos

### Si las animaciones no funcionan:

1. **Verificar que el navegador soporta CSS 3D**
2. **Revisar DevTools → Elements → Computed Styles**
3. **Verificar que `will-change: transform` está aplicado**

### Si el rendimiento es bajo:

1. **Verificar GPU acceleration** está habilitada
2. **Reducir más metaballs** en LavaLamp
3. **Desactivar animaciones** en mobile

---

## 🚀 Comandos Útiles

```bash
# Build optimizado
npm run build

# Ver tamaño del bundle
npm run build -- --analyze

# Comprimir imágenes
npm run compress-images

# Desarrollo con hot reload
npm run dev

# Preview del build
npm run preview
```

---

## ✅ Checklist Final

- [ ] Página carga en < 2 segundos
- [ ] FPS en 50-60 en desktop
- [ ] FPS en 50-60 en mobile
- [ ] Scroll es fluido
- [ ] Animaciones funcionan
- [ ] No hay memory leaks
- [ ] Lighthouse score > 85
- [ ] Sin errores en console
- [ ] Responsive en todos los dispositivos

---

**Última actualización:** Noviembre 20, 2025
