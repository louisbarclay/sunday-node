import { cmd } from '../mail/commands';

export const searchName = (emailText, nameVariants) => {
  for (let i = 0; i < nameVariants.length; i += 1) {
    let index = emailText.toLowerCase().indexOf(nameVariants[i].toLowerCase());
    let text = emailText;
    if (index < 0) {
      // If not found, or currentVariant doesn't exist
      text = false;
    } else {
      // Found the variant so finding the string after it
      text = text.substr(index + nameVariants[i].length);
      index = text.search(/[\u00C0-\u1FFF\u2C00-\uD7FF\w]/i);
      text = text.substr(index);
      index = text.search(/\n/i);
      text = text.substr(0, index);
      console.log(text);
      return text;
    }
  }
  return false;
};

const testAddAndRemove = `
  ADDREADER
  
  james@happy.com

  REMOVEREADER
  hippy@seller.com

  REMOVEREADER
   wack@seller.com
  louis.barclay@gmail.com
`;

const emailRegex = /([a-zA-Z0-9._+-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
const emailAddRegex = new RegExp(`(${cmd.addFriend}\\s+[a-zA-Z0-9._+-]+@[a-zA-Z0-9._-]+\\.[a-zA-Z0-9._-]+)`, 'gi');
const emailRemoveRegex = new RegExp(`(${cmd.deleteFriend}\\s+[a-zA-Z0-9._+-]+@[a-zA-Z0-9._-]+\\.[a-zA-Z0-9._-]+)`, 'gi');

export const searchAddAndRemove = (emailText) => {
  const addEmails = [];
  const removeEmails = [];
  function findEmails(emailsArray, regexOption) {
    if (emailText.match(regexOption) !== null) {
      emailText.match(regexOption).forEach((item) => {
        emailsArray.push(item.match(emailRegex)[0]);
      });
    }
  }
  findEmails(removeEmails, emailRemoveRegex);
  findEmails(addEmails, emailAddRegex);
  return {
    removeEmails,
    addEmails,
  };
};

searchAddAndRemove(testAddAndRemove);

export const searchEmails = (emailText) => {
  const emails = emailText.match(emailRegex);
  console.log(emails);
  return emails;
};

export const firstNameVariants = [
  'first name',
  'frist name',
  'fist name',
  'first nam',
  'firt name',
  'firs name',
  'first name',
  'firts name',
  'first nmae',
  'fistname',
  'firstname',
];

export const lastNameVariants = [
  'last name',
  'lastr name',
  'lsat name',
  'lats name',
  'last nmae',
  'last nam',
  'las name',
  'lasname',
  'lastname',
];

const testStory = `
This line.

\n
\n
\f
\t\t\t\t

That line.    
STORYEND
`;

export const prettifyStory = (emailText) => {
  if (emailText.includes('STORYEND')) {
    emailText = emailText.substr(0, emailText.indexOf('STORYEND'));
  }
  emailText = emailText.trim();
  // Replace assorted line breaks with new lines
  emailText = emailText.replace(/\r+|\f+/g, '\n');
  // Replace multiple new lines with 1 new line
  emailText = emailText.replace(/\n+/g, '\n');
  // Replace tabs with spaces
  emailText = emailText.replace(/\t+/g, ' ');
  // Replace multiple spaces with 1 space
  emailText = emailText.replace(/' '+/g, ' ');
};

prettifyStory(testStory);