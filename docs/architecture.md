# Arquitectura de Solucar

## Visión general

**Solucar** es el frontend web del ERP **Alixar**.

- **Solucar** = frontend (Angular)
- **Alixar** = backend (API canónica)

## Frontera de la API canónica

Solucar se comunica exclusivamente a través de la **API canónica de Alixar**. Esta API es la única frontera entre frontend y backend.

```
Solucar (Angular)
      │
      ▼
Alixar Canonical API
      │
      ├── temporalmente: adaptadores hacia Dolibarr
      └── finalmente: nuevo dominio/backend
```

## Organización del código Angular

```
src/app/
├── core/         # Elementos singleton e infraestructura frontend
│   ├── auth/     # Autenticación
│   ├── api/      # Cliente HTTP centralizado
│   ├── config/   # Configuración global
│   ├── permissions/ # Permisos
│   └── modules/  # Módulos core
├── shared/       # Componentes, utilidades y elementos reutilizables
└── features/     # Módulos funcionales del ERP
    └── home/     # Pantalla inicial
```

## Reglas fundamentales

1. **Sin reglas de negocio críticas** en el frontend. Pertenecen a Alixar.
2. **Sin conocimiento de la estructura física de la base de datos**. No nombres `llx_*`.
3. **Sin vocabulario técnico heredado de Dolibarr** como modelo interno.
4. **Consume API canónica de Alixar**. Los detalles HTTP quedan centralizados en `core/api`.
5. **Las features no implementan peculiaridades del backend**.
6. **No crear abstracciones antes de necesitarlas**.

## Objetivo de arquitectura

Poder sustituir progresivamente el backend (de adaptadores Dolibarr a nuevo dominio) **sin modificar las features** por peculiaridades legacy.