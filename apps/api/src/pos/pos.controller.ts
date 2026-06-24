import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { PosService } from "./pos.service";
import { AbrirCuentaDto, ActualizarProductoDto, AgregarItemDto, CobrarDto, CrearProductoDto, EntradaInventarioDto } from "./dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "CAJA")
@Controller("pos")
export class PosController {
  constructor(private readonly pos: PosService) {}

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
  anular(@Param("id") id: string) {
    return this.pos.anular(id);
  }

  // ── Reporte ──
  @Get("reporte")
  reporte() {
    return this.pos.reporte();
  }
}
