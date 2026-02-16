const { body } = require('express-validator');

class {{name}}Validator {
  
  static validateCreate = [
    // Field validations will be generated here
    {{validations}}
  ];

  static validateUpdate = [
    // Field validations will be generated here (optional)
    {{updateValidations}}
  ];
}

module.exports = {{name}}Validator;