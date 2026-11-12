import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

export default function SwaggerView() {
  return <SwaggerUI url="/api/public/v1/openapi.json" docExpansion="list" defaultModelsExpandDepth={0} tryItOutEnabled />;
}
