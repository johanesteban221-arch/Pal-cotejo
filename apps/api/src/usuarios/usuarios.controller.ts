import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { UsuariosService } from "./usuarios.service";
import { ActualizarUsuarioDto, CambiarPasswordDto, CrearUsuarioDto } from "./dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

// Gestion de usuarios staff: exclusivamente ADMIN.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@Controller("admin/usuarios")
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Post()
  crear(@Body() dto: CrearUsuarioDto) {
    return this.usuarios.crear(dto);
  }

  @Get()
  listar() {
    return this.usuarios.listar();
  }

  @Get(":id")
  obtener(@Param("id") id: string) {
    return this.usuarios.obtener(id);
  }

  @Patch(":id")
  actualizar(@Param("id") id: string, @Body() dto: ActualizarUsuarioDto, @Req() req: any) {
    return this.usuarios.actualizar(id, dto, req.user.sub);
  }

  @Patch(":id/password")
  cambiarPassword(@Param("id") id: string, @Body() dto: CambiarPasswordDto) {
    return this.usuarios.cambiarPassword(id, dto.password);
  }
}
