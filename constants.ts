import { AuthTypeDefinition } from './types';

export const AUTH_TYPES: AuthTypeDefinition[] = [
  {
    id: 'api_key',
    name: 'API 키',
    fields: [
      { key: 'api_key', label: 'API 키', type: 'password' }
    ],
    example: 'sk-...'
  },
  {
    id: 'basic_auth',
    name: '기본 인증 (ID/PW)',
    fields: [
      { key: 'username', label: '사용자명', type: 'text' },
      { key: 'password', label: '비밀번호', type: 'password' }
    ],
    example: 'user:pass'
  },
  {
    id: 'bearer_token',
    name: 'Bearer 토큰',
    fields: [
      { key: 'token', label: '토큰', type: 'password' }
    ],
    example: 'eyJhbGciOiJIUz...'
  },
  {
    id: 'oauth2',
    name: 'OAuth 2.0 클라이언트',
    fields: [
      { key: 'client_id', label: '클라이언트 ID', type: 'text' },
      { key: 'client_secret', label: '클라이언트 시크릿', type: 'password' }
    ]
  },
  {
    id: 'aws_creds',
    name: 'AWS 자격증명',
    fields: [
      { key: 'access_key_id', label: '액세스 키 ID', type: 'text' },
      { key: 'secret_access_key', label: '시크릿 액세스 키', type: 'password' },
      { key: 'region', label: '리전', type: 'text' }
    ]
  },
  {
    id: 'database',
    name: '데이터베이스 연결',
    fields: [
      { key: 'host', label: '호스트', type: 'text' },
      { key: 'port', label: '포트', type: 'text' },
      { key: 'username', label: '사용자명', type: 'text' },
      { key: 'password', label: '비밀번호', type: 'password' },
      { key: 'database', label: '데이터베이스명', type: 'text' }
    ]
  },
  {
    id: 'custom',
    name: '커스텀 (JSON)',
    fields: [
      { key: 'custom_json', label: 'JSON 데이터', type: 'textarea' }
    ]
  }
];

export const DB_KEY = 'secure_key_vault_db_v1';