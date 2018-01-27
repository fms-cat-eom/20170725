#define HUGE 9E16
#define PI 3.14159265
#define V vec3(0.,1.,-1.)
#define saturate(i) clamp(i,0.,1.)
#define lofi(i,m) (floor((i)/(m))*(m))

// ------

precision highp float;

varying vec3 vPos;
varying float vSize;
varying vec3 vNor;

uniform bool depth;
uniform int mode;

uniform float time;
uniform vec2 resolution;
uniform vec3 cameraPos;
uniform vec3 lightPos;

// ------

vec3 catColor( float _p ) {
  return 0.5 + 0.5 * vec3(
    cos( _p ),
    cos( _p + PI / 3.0 * 2.0 ),
    cos( _p + PI / 3.0 * 4.0 )
  );
}

void main() {
  if ( mode == 0 ) {
    gl_FragColor = vec4( 0.03 * V.yyy, 1.0 );
  } else if ( mode == 1 ) {
    gl_FragColor = vec4( 0.05 * V.yyy, 1.0 );
  } else {
    vec3 col = V.xxx;

    {
      float d = dot( vNor, normalize( vec3( 1.5, 1.0, 3.0 ) ) );
      col += 0.8 * catColor( d * 4.0 + 0.0 ) * pow( max( 0.0, d ), 4.0 );
    }

    gl_FragColor = vec4( col, 1.0 );
  }
}