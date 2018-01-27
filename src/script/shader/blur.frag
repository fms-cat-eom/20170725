precision highp float;

uniform float blurs;
uniform vec2 resolution;
uniform sampler2D texture;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  vec4 tex = texture2D( texture, uv );
  gl_FragColor = vec4( tex.xyz / blurs, 1.0 );
}
