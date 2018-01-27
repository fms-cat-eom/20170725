#define V vec2(0.,1.)
#define PI 3.14159265
#define HUGE 1E9
#define saturate(i) clamp(i,0.,1.)
#define lofi(i,d) floor(i/d)*d
#define validuv(v) (abs(v.x-0.5)<0.5&&abs(v.y-0.5)<0.5)

precision highp float;

uniform float time;
uniform vec2 resolution;

uniform vec3 yiqBase;
uniform vec3 yiqScale;

uniform sampler2D texture;
uniform sampler2D textureRandom;

float v2random( vec2 uv ) {
  return texture2D( textureRandom, mod( uv, vec2( 1.0 ) ) ).x;
}

vec3 rgb2yiq( vec3 rgb ) {
  return mat3( 0.299, 0.596, 0.211, 0.587, -0.274, -0.523, 0.114, -0.322, 0.312 ) * rgb;
}

vec3 yiq2rgb( vec3 yiq ) {
  return mat3( 1.000, 1.000, 1.000, 0.956, -0.272, -1.106, 0.621, -0.647, 1.703 ) * yiq;
}

vec3 vhsTex2D( vec2 uv ) {
  if ( validuv( uv ) ) {
    vec3 sig = V.yxx * rgb2yiq( texture2D( texture, uv ).xyz );
    sig += V.xyy * rgb2yiq( texture2D( texture, uv - 2.0 / resolution * V.yx ).xyz );
    sig *= 0.9 + 0.1 * texture2D( textureRandom, mod( uv * vec2( 1.0, 1.0 ) + time * vec2( 23.97, 24.45 ), vec2( 1.0 ) ) ).xyz;

    vec3 col = sig;
    col = (
      yiqBase +
      yiqScale * col
    );

    return yiq2rgb( col );
  }
  return vec3( 0.1, 0.1, 0.1 );
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;

  vec2 uvn = uv;
  vec3 col = vec3( 0.0, 0.0, 0.0 );

  // tape wave
  uvn.x += ( v2random( vec2( uvn.y / 10.0, time / 10.0 ) / 1.0 ) - 0.5 ) / resolution.x * 2.0;
  uvn.x += ( v2random( vec2( uvn.y, time * 10.0 ) ) - 0.5 ) / resolution.x * 2.0;

  // tape crease
  float tcPhase = smoothstep( 0.9, 0.96, sin( uvn.y * 8.0 - time * PI * 4.0 ) );
  float tcNoise = smoothstep( 0.3, 1.0, v2random( vec2( uvn.y * 4.77, time ) ) );
  float tc = tcPhase * tcNoise;
  uvn.x = uvn.x - tc / resolution.x * 16.0;

  // switching noise
  float snPhase = smoothstep( 0.02, 0.0, uvn.y );
  uvn.y += snPhase * 0.3;
  uvn.x += snPhase * ( ( v2random( vec2( uv.y * 100.0, time * 10.0 ) ) - 0.5 ) / resolution.x * 24.0 );

  // fetch
  col = vhsTex2D( uvn );

  // crease noise
  float cn = tcNoise * ( 0.3 + 0.7 * tcPhase );
  if ( 0.29 < cn ) {
    vec2 uvt = ( uvn + V.yx * v2random( vec2( uvn.y, time ) ) ) * vec2( 0.25, 1.0 );
    float n0 = v2random( uvt );
    float n1 = v2random( uvt + V.yx / resolution.x );
    if ( n1 < n0 ) {
      col = mix( col, 2.0 * V.yyy, pow( n0, 12.0 ) );
    }
  }

  // switching color modification
  col = mix(
    col,
    col.yzx,
    snPhase * 0.4
  );

  gl_FragColor = vec4( col, 1.0 );
}