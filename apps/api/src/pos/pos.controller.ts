import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { PosService } from "./pos.service";
import { AbrirCajaDto, AbrirCuentaDto, CerrarCajaDto, ActualizarProductoDto, AgregarItemDto, CobrarDto, CobrarReservaDto, CrearProductoDto, EntradaInventarioDto } from "./dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "SUPERVISOR", "CAJA")
@Controller("pos")
export class PosController {
  constructor(private readonly pos: PosService) {}

  @Get("mesas")
  mesas() {
    return this.pos.listarMesas();
  }

  // Métodos de cobro activos para elegir al cobrar (A·S·C, hereda del @Roles del controller).
  @Get("metodos-cobro")
  metodosCobro() {
    return this.pos.listarMetodosCobro();
  }

  // ── Caja ──
  @Post("caja/abrir")
  abrirCaja(@Body() dto: AbrirCajaDto, @Req() req: any) {
    return this.pos.abrirCaja(req.user.sub, dto.montoInicial);
  }

  @Get("caja/actual")
  cajaActual() {
    return this.pos.cajaActual();
  }

  @Post("caja/cerrar")
  cerrarCaja(@Body() dto: CerrarCajaDto, @Req() req: any) {
    return this.pos.cerrarCaja(req.user.sub, dto.montoContado, dto.nota);
  }

  // Arqueo completo de una sesión: solo ADMIN (cierre a ciegas para caja/supervisor).
  @Roles("ADMIN")
  @Get("caja/:id")
  sesion(@Param("id") id: string) {
    return this.pos.obtenerSesion(id);
  }

  // ── Catálogo ──
  @Get("productos")
  listarProductos(@Query("todos") todos?: string) {
    return this.pos.listarProductos(todos !== "1");
  }

  @Roles("ADMIN")
  @Post("productos")
  crearProducto(@Body() dto: CrearProductoDto) {
    return this.pos.crearProducto(dto);
  }

  @Roles("ADMIN")
  @Patch("productos/:id")
  actualizarProducto(@Param("id") id: string, @Body() dto: ActualizarProductoDto) {
    return this.pos.actualizarProducto(id, dto);
  }

  @Roles("ADMIN")
  @Delete("productos/:id")
  desactivarProducto(@Param("id") id: string) {
    return this.pos.desactivarProducto(id);
  }

  @Roles("ADMIN")
  @Post("productos/:id/entrada")
  entrada(@Param("id") id: string, @Body() dto: EntradaInventarioDto) {
    return this.pos.entradaInventario(id, dto.cantidad, dto.motivo);
  }

  @Roles("ADMIN")
  @Delete("productos/:id/permanente")
  eliminar(@Param("id") id: string) {
    return this.pos.eliminarProducto(id);
  }

  @Get("stock-bajo")
  stockBajo() {
    return this.pos.productosBajoStock();
  }

  @Roles("ADMIN", "SUPERVISOR")
  @Get("inventario/valor")
  valorInventario() {
    return this.pos.valorInventario();
  }

  @Roles("ADMIN", "SUPERVISOR")
  @Get("inventario/movimientos")
  movimientos(@Query("limit") limit?: string) {
    return this.pos.movimientos(limit ? Number(limit) : 150);
  }

  // ── Cuentas ──
  @Post("cuentas")
  abrir(@Body() dto: AbrirCuentaDto) {
    return this.pos.abrirCuenta(dto);
  }

  @Get("cuentas/abiertas")
  abiertas() {
    return this.pos.cuentasAbiertas();
  }

  @Get("cuentas/:id")
  obtener(@Param("id") id: string) {
    return this.pos.obtenerCuenta(id);
  }

  @Post("cuentas/:id/items")
  agregarItem(@Param("id") id: string, @Body() dto: AgregarItemDto) {
    return this.pos.agregarItem(id, dto);
  }

  @Delete("items/:itemId")
  quitarItem(@Param("itemId") itemId: string) {
    return this.pos.quitarItem(itemId);
  }

  @Post("cuentas/:id/cobrar")
  cobrar(@Param("id") id: string, @Body() dto: CobrarDto) {
    return this.pos.cobrar(id, dto.metodoPago);
  }

  @Post("cuentas/:id/anular")
  anular(@Param("id") id: string, @Req() req: any) {
    return this.pos.anular(id, req.user.rol);
  }

  // ── Cobro de reservas (liga a la caja como una venta más) ──
  @Post("reservas/:id/cobrar")
  cobrarReserva(@Param("id") id: string, @Body() dto: CobrarReservaDto) {
    return this.pos.cobrarReserva(id, dto.metodoPago, dto.monto);
  }

  // ── Reporte ──
  // Contadores de negocio (ventas Hoy/Semana, top productos): solo ADMIN.
  // El cajero/supervisor no los ve ni por API (además de ocultarse en el front).
  @Roles("ADMIN")
  @Get("reporte")
  reporte() {
    return this.pos.reporte();
  }
}
