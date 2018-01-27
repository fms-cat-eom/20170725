#define HUGE 9E16
#define PI 3.14159265
#define V vec3(0.,1.,-1.)
#define saturate(i) clamp(i,0.,1.)
#define lofi(i,m) (floor((i)/(m))*(m))

// ------

precision highp float;

uniform float time;
uniform vec2 resolution;

uniform sampler2D textureBloom;
uniform sampler2D textureBlur;

// ------

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  float vig = 1.14 - length( uv - 0.5 ) * 0.4;

  vec3 tex = vec3(
    texture2D( textureBlur, ( uv - 0.5 ) * 0.990 + 0.5 ).x,
    texture2D( textureBlur, ( uv - 0.5 ) * 0.995 + 0.5 ).y,
    texture2D( textureBlur, ( uv - 0.5 ) * 1.000 + 0.5 ).z
  );
  tex += texture2D( textureBloom, uv ).xyz;
  tex = mix(
    vec3( 0.0 ),
    tex,
    vig
  );

  vec3 col = tex.xyz;
  col = vec3(
    smoothstep( -0.1, 1.1, col.x ),
    smoothstep( 0.0, 1.0, col.y ),
    smoothstep( -0.3, 1.3, col.z )
  );
  gl_FragColor = vec4( col, 1.0 );
}