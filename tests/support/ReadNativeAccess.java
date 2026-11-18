import com.healthmarketscience.jackcess.*;
import java.io.*;
import java.util.*;

class ReadNativeAccess {
    public static void main(String... args) throws Exception {
        try (Database db = DatabaseBuilder.open(new File(args[0]))) {
            var queries = db.getQueries();
            if (queries.size() != 1 || !queries.get(0).getName().equals("SociosActivos")
                || !queries.get(0).toSQLString().replaceAll("\\s+", " ").equals(
                    "SELECT S.nombre AS socio FROM Socio AS S WHERE S.id_socio > 0;")) {
                throw new AssertionError("La consulta guardada no conserva su definición.");
            }
            Table loan = db.getTable("Prestamo");
            Row row = loan.iterator().next();
            if (db.getFileFormat() != Database.FileFormat.V2010
                || db.getTableNames().size() != 3 || db.getRelationships().size() != 2
                || db.getRelationships().stream().anyMatch(r -> !r.hasReferentialIntegrity())
                || loan.getRowCount() != 1 || row.getInt("id_prestamo") != 8
                || !"A & B".equals(db.getTable("Socio").iterator().next().getString("nombre"))
                || !"Nombre visible".equals(db.getTable("Socio").getColumn("nombre").getProperties().getValue("Caption"))
                || loan.getColumn("fecha").getType() != DataType.SHORT_DATE_TIME) {
                throw new AssertionError("El modelo o los datos cambiaron al reabrir el ACCDB.");
            }
        }
    }
}
